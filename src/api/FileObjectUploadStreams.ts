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

export class FileObjectUploadStreams extends EventEmitter implements FileObjectUploadProtocol, Abortable {
  private fileMeta: FileMeta;
  private config: EnvironmentConfig;
  private requests: INXTRequest[] = [];
  private id = '';
  private aborted = false;
  private api: InxtApiI;
  shardMetas: ShardMeta[] = [];
  private logger: winston.Logger;

  bucketId: string;
  frameId: string;
  index: Buffer;
  encrypted = false;

  fileEncryptionKey: Buffer;
  iv: Buffer;

  uploader: UploadStrategy;

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

    this.fileEncryptionKey = randomBytes(32);
    this.index = randomBytes(32);
    this.iv = this.index.slice(0, 16);

    // this.once(UPLOAD_CANCELLED, this.abort.bind(this));
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

  async init(): Promise<FileObjectUploadStreams> {
    this.checkIfIsAborted();

    this.fileEncryptionKey = await GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index);

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
    console.log('FileEncryptionKey: %s', this.fileEncryptionKey.toString('hex'));
    console.log('Index: %s', this.index.toString('hex'));
    console.log('IV: %s', this.iv.toString('hex'));

    this.checkIfIsAborted();

    this.uploader.setIv(this.iv);
    this.uploader.setFileEncryptionKey(this.fileEncryptionKey);

    this.uploader.once(UploadEvents.Started, () => {
      this.logger.info('Upload started');
    });

    let currentBytesUploaded = 0;
    this.uploader.on(UploadEvents.ShardUploadSuccess, (message: ShardUploadSuccessMessage) => {
      this.logger.debug('Shard %s uploaded correctly. Size %s', message.hash, message.size);
      currentBytesUploaded = updateProgress(this.getSize(), currentBytesUploaded, message.size, cb);
    });

    return new Promise((resolve, reject) => {
      this.uploader.once(UploadEvents.Aborted, () => {
        this.logger.info('Upload aborted');
        this.uploader.removeAllListeners();
      });

      this.uploader.once(UploadEvents.Error, (err) => {
        this.logger.error(err);
        this.uploader.removeAllListeners();
        reject(err);
      });

      this.uploader.on(UploadEvents.Finished, (message: UploadFinishedMessage) => {
        console.log('Upload finished');
        resolve(message.result as ShardMeta[]);
      });

      const negotiateContract = (shardMeta: ShardMeta) => {
        return new ShardObject(this.api, this.frameId, shardMeta).negotiateContract();
      };

      this.uploader.upload(negotiateContract);
    });
  }

  // upload(): Promise<ShardMeta[]> {
  //   this.checkIfIsAborted();

  //   const ramUsage = 200 * 1024 * 1024; // 200Mb
  //   const shardSize = determineShardSize(this.fileMeta.size);
  //   const nShards = Math.ceil(this.fileMeta.size / shardSize);
  //   const concurrency = Math.min(determineConcurrency(ramUsage, this.fileMeta.size), nShards);

  //   const shards = [];

  //   this.logger.info('Starting file upload');

  //   for (let i = 0, shardIndex = 0; i < nShards; i += shardSize, shardIndex++) {
  //     const start = i;
  //     const end = i + shardSize - 1 > this.fileMeta.size ? this.fileMeta.size : i + shardSize - 1;

  //     shards.push({
  //       source: createReadStream(this.fileMeta.path, { start, end }),
  //       size: end - start,
  //       index: shardIndex
  //     });

  //     this.logger.debug('Shard %s stream generated [byte %s to byte %s]', shardIndex, start, end);
  //   }

  //   const shardMetas: ShardMeta[] = [];

  //   // TODO: use concurrency instead of 1
  //   // TODO: add retry 3 times
  //   // TODO: add upload progress callback
  //   return eachLimit(shards, 1, (shard, next) => {
  //     const encryptStream = new EncryptStream(this.fileEncryptionKey, this.iv);
  //     const hashStream = new HashStream();
  //     let shardMeta: ShardMeta;

  //     // 1. Encriptar shard
  //     // 2. Calcular hash
  //     new Promise((resolve, reject) => {
  //       cloneable(shard.source).pipe(encryptStream).pipe(hashStream)
  //         .on('error', reject)
  //         .on('end', resolve);
  //     }).then(() => {
  //       // 3. Generar meta
  //       shardMeta = {
  //         hash: hashStream.getHash().toString('hex'),
  //         size: shard.size,
  //         index: shard.index,
  //         parity: false,
  //         challenges_as_str: [],
  //         tree: []
  //       };

  //       this.logger.info('Uploading shard %s', shardMeta.hash);
  //       shardMetas.push(shardMeta);
  //       // 4. Negociar contrato

  //       return new ShardObject(this.api, this.frameId, shardMeta)
  //         .negotiateContract();
  //     }).then((contract) => {
  //       // 5. Crear stream, volver a encriptar, subir archivo
  //       const uploadShardParams = {
  //         index: shardMeta.index,
  //         replaceCount: 0,
  //         hash: shardMeta.hash,
  //         size: shardMeta.size,
  //         parity: false,
  //         token: contract.token,
  //         farmer: { ...contract.farmer, lastSeen: new Date() },
  //         operation: contract.operation
  //       };

  //       const req = https.request({
  //         protocol: 'https',
  //         method: 'POST',
  //         hostname: 'proxy01.api.internxt.com',
  //         path: `/http://${uploadShardParams.farmer.address}:${uploadShardParams.farmer.port}/shards/${uploadShardParams.hash}?token=${uploadShardParams.token}`,
  //         headers: {
  //           'Content-Type': 'application/octet-stream'
  //         }
  //       });

  //       cloneable(shard.source).pipe(encryptStream).pipe(req)
  //         .on('error', (err) => {
  //           next(err);
  //         })
  //         .on('finish', () => {
  //           this.logger.info('Shard %s uploaded!', shardMeta.hash);
  //           next();
  //         });

  //       // return new ShardObject(this.api, this.frameId, shardMeta)
  //       //   .streamShardToNode(
  //       //     cloneable(shard.source).pipe(encryptStream),
  //       //     uploadShardParams
  //       //   );
  //     }).catch((err) => {
  //       next(err);
  //     });
  //   }).then(() => {
  //     return shardMetas;
  //   }).catch((err) => {
  //     console.error('Error during upload');
  //     console.error(err);

  //     throw wrap('Shard upload error', err);
  //   });
  // }

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
  }

  isAborted(): boolean {
    return this.aborted;
  }
}

export function generateBucketEntry(fileObject: FileObjectUploadStreams, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody {
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
