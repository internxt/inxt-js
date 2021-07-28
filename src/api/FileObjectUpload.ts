import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import * as Winston from 'winston';

import { EnvironmentConfig, UploadProgressCallback } from '..';

import EncryptStream from '../lib/encryptStream';
import { GenerateFileKey, sha512HmacBuffer } from "../lib/crypto";
import { FunnelStream } from "../lib/funnelStream";
import { getShardMeta, ShardMeta } from '../lib/shardMeta';
import { ContractNegotiated } from '../lib/contracts';

import { ExchangeReport } from "./reports";
import { Shard } from "./shard";
import { wrap } from '../lib/utils/error';
import { UPLOAD_CANCELLED } from './constants';
import { UploaderQueue } from '../lib/upload/uploader';
import { logger } from '../lib/utils/logger';
import { determineConcurrency, determineShardSize } from '../lib/utils';
import { Bridge, CreateEntryFromFrameBody, CreateEntryFromFrameResponse, FrameStaging, InxtApiI, SendShardToNodeResponse } from '../services/api';
import { INXTRequest } from '../lib';
import { ShardObject } from './ShardObject';

export interface FileMeta {
  size: number;
  name: string;
  content: Readable;
}

export class FileObjectUpload extends EventEmitter {
  private config: EnvironmentConfig;
  private fileMeta: FileMeta;
  private requests: INXTRequest[] = [];
  private id = '';
  private aborted = false;
  private api: InxtApiI;
  shardMetas: ShardMeta[] = [];
  private logger: Winston.Logger;

  bucketId: string;
  frameId: string;
  index: Buffer;
  encrypted = false;

  cipher: EncryptStream;
  funnel: FunnelStream;
  fileEncryptionKey: Buffer;

  constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, log: Winston.Logger, api?: InxtApiI) {
    super();

    this.config = config;
    this.index = Buffer.alloc(0);
    this.fileMeta = fileMeta;
    this.bucketId = bucketId;
    this.frameId = '';
    this.funnel = new FunnelStream(determineShardSize(fileMeta.size));
    this.cipher = new EncryptStream(randomBytes(32), randomBytes(16));
    this.fileEncryptionKey = randomBytes(32);
    this.api = api ?? new Bridge(this.config);

    this.logger = log;

    this.once(UPLOAD_CANCELLED, this.abort.bind(this));
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

  async init(): Promise<FileObjectUpload> {
    this.checkIfIsAborted();

    this.index = randomBytes(32);
    this.fileEncryptionKey = await GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index);

    this.cipher = new EncryptStream(this.fileEncryptionKey, this.index.slice(0, 16));

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

  SaveFileInNetwork(bucketEntry: CreateEntryFromFrameBody): Promise<void | CreateEntryFromFrameResponse> {
    this.checkIfIsAborted();

    const req = this.api.createEntryFromFrame(this.bucketId, bucketEntry);
    this.requests.push(req);

    return req.start<CreateEntryFromFrameResponse>()
      .catch((err) => {
        throw wrap('Saving file in network error', err);
      });
  }

  negotiateContract(frameId: string, shardMeta: ShardMeta): Promise<void | ContractNegotiated> {
    this.checkIfIsAborted();

    const req = this.api.addShardToFrame(frameId, shardMeta);
    this.requests.push(req);

    return req.start<ContractNegotiated>()
      .catch((err) => {
        throw wrap('Contract negotiation error', err);
      });
  }

  NodeRejectedShard(encryptedShard: Buffer, shard: Shard): Promise<boolean> {
    this.checkIfIsAborted();

    const req = this.api.sendShardToNode(shard, encryptedShard);
    this.requests.push(req);

    return req.start<SendShardToNodeResponse>()
      .then(() => false)
      .catch((err) => {
        if (err.response && err.response.status < 400) {
          return true;
        }
        throw wrap('Farmer request error', err);
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

  encrypt(): EncryptStream {
    this.encrypted = true;

    return this.fileMeta.content.pipe(this.funnel).pipe(this.cipher);
  }

  private parallelUpload(callback: UploadProgressCallback): Promise<ShardMeta[]> {
    const ramUsage = 200 * 1024 * 1024; // 200Mb
    const nShards = Math.ceil(this.fileMeta.size / determineShardSize(this.fileMeta.size));
    const concurrency = Math.min(determineConcurrency(ramUsage, this.fileMeta.size), nShards);

    logger.debug('Using parallel upload (%s shards, %s concurrent uploads)', nShards, concurrency);

    const uploader = new UploaderQueue(concurrency, nShards, this);

    let currentBytesUploaded = 0;
    uploader.on('upload-progress', ([bytesUploaded]) => {
      currentBytesUploaded = updateProgress(this.getSize(), currentBytesUploaded, bytesUploaded, callback);
    });

    this.on(UPLOAD_CANCELLED, () => {
      uploader.emit('error', Error('Upload aborted'));
    });

    this.cipher.pipe(uploader.getUpstream());

    return new Promise((resolve, reject) => {
      uploader.once('end', () => {
        resolve(this.shardMetas);
      });

      uploader.once('error', ([err]) => {
        reject(err);
      });
    });
  }

  upload(callback: UploadProgressCallback): Promise<ShardMeta[]> {
    this.checkIfIsAborted();

    if (!this.encrypted) {
      throw new Error('Tried to upload a file not encrypted. Use .encrypt() before upload()');
    }

    return this.parallelUpload(callback);
  }

  uploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number, parity: boolean): Promise<ShardMeta> {
    const shardMeta: ShardMeta = getShardMeta(encryptedShard, shardSize, index, parity);

    logger.info('Uploading shard %s index %s size %s parity %s', shardMeta.hash, shardMeta.index, shardMeta.size, parity);

    const shardObject = new ShardObject(this.api, frameId, shardMeta);

    shardObject.once(ShardObject.Events.NodeTransferFinished, ({ success, nodeID, hash }) => {
      const exchangeReport = new ExchangeReport(this.config);
      exchangeReport.params.dataHash = hash;
      exchangeReport.params.farmerId = nodeID;
      exchangeReport.params.exchangeEnd = new Date();

      if (success) {
        logger.debug('Node %s accepted shard %s', nodeID, hash);
        exchangeReport.UploadOk();
      } else {
        exchangeReport.UploadError();
      }

      exchangeReport.sendReport().catch(() => {
        // no op
      });
    });

    return shardObject.upload(encryptedShard)
      .then((res) => {
        logger.info('Shard %s uploaded succesfully', shardMeta.hash);

        return res;
      })
      .catch((err) => {
        if (attemps > 1 && !this.aborted) {
          logger.error('Upload for shard %s failed. Reason %s. Retrying ...', shardMeta.hash, err.message);

          return this.uploadShard(encryptedShard, shardSize, frameId, index, attemps - 1, parity);
        }
        throw wrap('Uploading shard error', err);
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
    logger.info('Aborting file upload');

    this.aborted = true;
    this.requests.forEach((r) => r.abort());

    this.funnel.unpipe(this.cipher);
    this.fileMeta.content.unpipe(this.funnel);

    this.fileMeta.content.destroy();
    this.funnel.destroy();
    this.cipher.destroy();
  }

  isAborted(): boolean {
    return this.aborted;
  }
}

function updateProgress(totalBytes: number, currentBytesUploaded: number, newBytesUploaded: number, progress: UploadProgressCallback): number {
  const newCurrentBytes = currentBytesUploaded + newBytesUploaded;
  const progressCounter = newCurrentBytes / totalBytes;

  progress(progressCounter, newCurrentBytes, totalBytes);

  return newCurrentBytes;
}

export function generateBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody {
  const bucketEntry: CreateEntryFromFrameBody = {
    frame: fileObject.frameId,
    filename: fileMeta.name,
    index: fileObject.index.toString('hex'),
    hmac: { type: 'sha512', value: fileObject.GenerateHmac(shardMetas) }
  };

  // console.log('FINAL HMAC', bucketEntry.hmac);

  if (rs) {
    bucketEntry.erasure = { type: "reedsolomon" };
  }

  return bucketEntry;
}
