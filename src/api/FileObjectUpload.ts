import { EventEmitter, Readable } from 'stream';
import { randomBytes } from 'crypto';
import * as Winston from 'winston';

import { EnvironmentConfig, UploadProgressCallback } from '..';
import * as api from '../services/request';

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

export interface FileMeta {
  size: number;
  name: string;
  content: Readable;
}

export class FileObjectUpload extends EventEmitter {
  private config: EnvironmentConfig;
  private fileMeta: FileMeta;
  private requests: api.INXTRequest[] = [];
  private id = '';
  private aborted = false;
  shardMetas: ShardMeta[] = [];
  private logger: Winston.Logger;

  bucketId: string;
  frameId: string;
  index: Buffer;
  encrypted = false;

  cipher: EncryptStream;
  funnel: FunnelStream;
  fileEncryptionKey: Buffer;

  constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, logger: Winston.Logger) {
    super();

    this.config = config;
    this.index = Buffer.alloc(0);
    this.fileMeta = fileMeta;
    this.bucketId = bucketId;
    this.frameId = '';
    this.funnel = new FunnelStream(determineShardSize(fileMeta.size));
    this.cipher = new EncryptStream(randomBytes(32), randomBytes(16));
    this.fileEncryptionKey = randomBytes(32);

    this.logger = logger;

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

    // if bucket not exists, bridge returns an error
    return api.getBucketById(this.config, this.bucketId).then((res) => {
      logger.info('Bucket %s exists', this.bucketId);

      return res ? true : false;
    })
    .catch((err) => {
      throw wrap('Bucket existence check error', err);
    });
  }

  stage(): Promise<void> {
    this.checkIfIsAborted();

    return api.createFrame(this.config).then((frame) => {
      if (!frame || !frame.id) {
        throw new Error('Frame response is empty');
      }

      this.frameId = frame.id;

      logger.info('Staged a file with frame %s', this.frameId);
    }).catch((err) => {
      throw wrap('Bridge frame creation error', err);
    });
  }

  SaveFileInNetwork(bucketEntry: api.CreateEntryFromFrameBody): Promise<void | api.CreateEntryFromFrameResponse> {
    this.checkIfIsAborted();

    return api.createEntryFromFrame(this.config, this.bucketId, bucketEntry)
      .catch((err) => {
        throw wrap('Saving file in network error', err);
      });
  }

  negotiateContract(frameId: string, shardMeta: ShardMeta): Promise<void | ContractNegotiated> {
    this.checkIfIsAborted();

    return api.addShardToFrame(this.config, frameId, shardMeta)
      .catch((err) => {
        throw wrap('Contract negotiation error', err);
      });
  }

  NodeRejectedShard(encryptedShard: Buffer, shard: Shard): Promise<boolean> {
    this.checkIfIsAborted();

    const request = api.sendShardToNode(this.config, shard);

    this.requests.push(request);

    // return request.stream<api.SendShardToNodeResponse>(Readable.from(encryptedShard))
    //   .then(() => false)
    //   .catch((err) => {
    //     throw wrap('Farmer request error', err);
    //   });

    return request.start<api.SendShardToNodeResponse>({ data: encryptedShard })
      .then(() => false)
      .catch((err: AxiosError) => {
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

    this.cipher.pipe(uploader.getUpstream());

    return new Promise((resolve, reject) => {
      uploader.on('end', () => {
        resolve(this.shardMetas);
      });

      uploader.on('error', reject);
    });
  }

  upload(callback: UploadProgressCallback): Promise<ShardMeta[]> {
    this.checkIfIsAborted();

    if (!this.encrypted) {
      throw new Error('Tried to upload a file not encrypted. Use .encrypt() before upload()');
    }

    return this.parallelUpload(callback);
  }

  async uploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number, parity: boolean): Promise<ShardMeta> {
    const shardMeta: ShardMeta = getShardMeta(encryptedShard, shardSize, index, parity);

    logger.info('Uploading shard %s index %s size %s parity %s', shardMeta.hash, shardMeta.index, shardMeta.size, parity);

    try {
      const negotiatedContract: ContractNegotiated | void = await this.negotiateContract(frameId, shardMeta);

      if (!negotiatedContract) {
        throw new Error('Unable to receive storage offer');
      }

      const token = negotiatedContract.token;
      const operation = negotiatedContract.operation;
      const farmer = { ...negotiatedContract.farmer, lastSeen: new Date() };

      logger.debug('Negotiated succesfully contract for shard %s (index %s, size %s) with token %s',
        shardMeta.hash,
        shardMeta.index,
        shardMeta.size,
        token
      );

      const hash = shardMeta.hash;
      const shard: Shard = { index, replaceCount: 0, hash, size: shardSize, parity, token, farmer, operation };

      const exchangeReport = new ExchangeReport(this.config);
      exchangeReport.params.dataHash = hash;
      exchangeReport.params.farmerId = shard.farmer.nodeID;

      if (await this.NodeRejectedShard(encryptedShard, shard)) {
        exchangeReport.UploadError();
      } else {
        logger.debug('Node %s accepted shard %s', shard.farmer.nodeID, shard.hash);

        exchangeReport.UploadOk();
      }

      exchangeReport.params.exchangeEnd = new Date();
      exchangeReport.sendReport().catch(() => {
        // no op
      });
    } catch (err) {
      if (attemps > 1 && !this.aborted) {
        logger.error('Upload for shard %s failed. Reason %s. Retrying ...', shardMeta.hash, err.message);
        await this.uploadShard(encryptedShard, shardSize, frameId, index, attemps - 1, parity);
      } else {
        return Promise.reject(wrap('Upload shard error', err));
      }
    }

    logger.info('Shard %s uploaded succesfully', shardMeta.hash);

    return shardMeta;
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

export function generateBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): api.CreateEntryFromFrameBody {
  const bucketEntry: api.CreateEntryFromFrameBody = {
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
