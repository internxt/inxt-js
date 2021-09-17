import { EventEmitter } from "stream";
import { randomBytes } from "crypto";
import winston from "winston";

import { EnvironmentConfig, UploadProgressCallback } from "..";
import { FileObjectUploadProtocol } from "./FileObjectUploadProtocol";
import { ShardObject } from "./ShardObject";
import { ShardMeta } from "../lib/shardMeta";
import { INXTRequest } from "../lib";
import { Bridge, CreateEntryFromFrameBody, CreateEntryFromFrameResponse, FrameStaging, InxtApiI } from "../services/api";
import { GenerateFileKey, sha512HmacBuffer } from "../lib/crypto";
import { logger } from "../lib/utils/logger";
import { wrap } from "../lib/utils/error";
import { ShardUploadSuccessMessage, UploadEvents, UploadFinishedMessage, UploadStrategy } from "../lib/upload/UploadStrategy";
import { FileMeta } from "./FileObjectUpload";
import { Abortable } from "./Abortable";

import { Events } from './events';

export class FileObjectUploadV2 extends EventEmitter implements FileObjectUploadProtocol, Abortable {
  private fileMeta: FileMeta;
  private config: EnvironmentConfig;
  private requests: INXTRequest[] = [];
  private id = '';
  private aborted = false;
  private api: InxtApiI;
  private logger: winston.Logger;
  private uploader: UploadStrategy;

  iv: Buffer;
  index: Buffer;
  frameId: string;
  bucketId: string;
  fileEncryptionKey = Buffer.alloc(0);

  constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, log: winston.Logger, uploader: UploadStrategy, api?: InxtApiI) {
    super();

    this.fileMeta = fileMeta;
    this.uploader = uploader;

    this.config = config;
    this.index = Buffer.alloc(0);
    this.bucketId = bucketId;
    this.frameId = '';
    this.api = api ?? new Bridge(this.config);

    this.logger = log;

    if (this.config.inject && this.config.inject.index) {
      this.index = this.config.inject.index;
      this.logger.debug('Using injected index %s', this.index.toString('hex'));
    } else {
      this.index = randomBytes(32);
    }

    this.iv = this.index.slice(0, 16);

    this.once(Events.Upload.Abort, this.abort.bind(this));
  }

  getSize(): number {
    return this.fileMeta.size;
  }

  getId(): string {
    return this.id;
  }

  checkIfIsAborted() {
    if (this.isAborted()) {
      throw new Error('Upload aborted');
    }
  }

  async init(): Promise<FileObjectUploadV2> {
    this.checkIfIsAborted();

    if (this.config.inject && this.config.inject.fileEncryptionKey) {
      this.fileEncryptionKey = this.config.inject.fileEncryptionKey;
      this.logger.debug('Using injected file encryption key %s', this.fileEncryptionKey.toString('hex'));
    } else {
      this.fileEncryptionKey = await GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index);
    }

    return this;
  }

  async checkBucketExistence(): Promise<boolean> {
    this.checkIfIsAborted();

    const req = this.api.getBucketById(this.bucketId);
    this.requests.push(req);

    return req.start().then(() => {
      logger.info('Bucket %s exists', this.bucketId);

      return true;
    }).catch((err) => {
      throw wrap('Bucket existence check error', err);
    });
  }

  stage(): Promise<void> {
    this.checkIfIsAborted();

    const req = this.api.createFrame();
    this.requests.push(req);

    return req.start<FrameStaging>().then((frame) => {
      if (!frame || !frame.id) {
        throw new Error('Frame response is empty');
      }

      this.frameId = frame.id;

      logger.info('Staged a file with frame %s', this.frameId);
    }).catch((err) => {
      throw wrap('Bridge frame creation error', err);
    });
  }

  SaveFileInNetwork(bucketEntry: CreateEntryFromFrameBody): Promise<CreateEntryFromFrameResponse> {
    this.checkIfIsAborted();

    const req = this.api.createEntryFromFrame(this.bucketId, bucketEntry);
    this.requests.push(req);

    return req.start<CreateEntryFromFrameResponse>()
      .catch((err) => {
        throw wrap('Saving file in network error', err);
      });
  }

  GenerateHmac(shardMetas: ShardMeta[]): string {
    const shardMetasCopy = [...shardMetas].sort((sA, sB) => sA.index - sB.index);
    const hmac = sha512HmacBuffer(this.fileEncryptionKey);

    for (const shardMeta of shardMetasCopy) {
      hmac.update(Buffer.from(shardMeta.hash, 'hex'));
    }

    return hmac.digest().toString('hex');
  }

  upload(cb: UploadProgressCallback): Promise<ShardMeta[]> {
    this.checkIfIsAborted();

    this.uploader.setFileEncryptionKey(this.fileEncryptionKey);
    this.uploader.setIv(this.iv);

    this.uploader.once(UploadEvents.Started, () => this.logger.info('Upload started'));
    this.uploader.once(UploadEvents.Aborted, () => this.uploader.emit(UploadEvents.Error, new Error('Upload aborted')));
    this.uploader.on(UploadEvents.Progress, (progress: number) => this.emit(UploadEvents.Progress, progress));

    let currentBytesUploaded = 0;
    this.uploader.on(UploadEvents.ShardUploadSuccess, (message: ShardUploadSuccessMessage) => {
      this.logger.debug('Shard %s uploaded correctly. Size %s', message.hash, message.size);
      currentBytesUploaded = updateProgress(this.getSize(), currentBytesUploaded, message.size, cb);
    });

    const errorHandler = (reject: (err: Error) => void) => (err: Error) => {
      this.uploader.removeAllListeners();
      reject(err);
    };

    const finishHandler = (resolve: (result: ShardMeta[]) => void) => (message: UploadFinishedMessage) => {
      this.uploader.removeAllListeners();
      resolve(message.result);
    };

    const negotiateContract = (shardMeta: ShardMeta) => {
      return new ShardObject(this.api, this.frameId, shardMeta).negotiateContract();
    };

    return new Promise((resolve, reject) => {
      this.uploader.once(UploadEvents.Error, errorHandler(reject));
      this.uploader.once(UploadEvents.Finished, finishHandler(resolve));

      this.uploader.upload(negotiateContract);
    });
  }

  createBucketEntry(shardMetas: ShardMeta[]): Promise<void> {
    return this.SaveFileInNetwork(generateBucketEntry(this, this.fileMeta, shardMetas, false))
      .then((bucketEntry) => {
        if (!bucketEntry) {
          throw new Error('Can not save the file in the network');
        }
        this.id = bucketEntry.id;
      })
      .catch((err) => {
        throw wrap('Bucket entry creation error', err);
      });
  }

  abort(): void {
    this.aborted = true;
    this.requests.forEach((r) => r.abort());
    this.uploader.abort();
  }

  isAborted(): boolean {
    return this.aborted;
  }
}

export function generateBucketEntry(fileObject: FileObjectUploadV2, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody {
  const bucketEntry: CreateEntryFromFrameBody = {
    frame: fileObject.frameId,
    filename: fileMeta.name,
    index: fileObject.index.toString('hex'),
    hmac: { type: 'sha512', value: fileObject.GenerateHmac(shardMetas) }
  };

  if (rs) {
    bucketEntry.erasure = { type: "reedsolomon" };
  }

  return bucketEntry;
}

function updateProgress(totalBytes: number, currentBytesUploaded: number, newBytesUploaded: number, progress: UploadProgressCallback): number {
  const newCurrentBytes = currentBytesUploaded + newBytesUploaded;
  const progressCounter = newCurrentBytes / totalBytes;

  progress(progressCounter, newCurrentBytes, totalBytes);

  return newCurrentBytes;
}
