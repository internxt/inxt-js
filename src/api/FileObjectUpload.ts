import { utils } from 'rs-wrapper';
import { Readable } from 'stream';
import { randomBytes } from 'crypto';

import { EnvironmentConfig, UploadProgressCallback } from '..';
import * as api from '../services/request';

import EncryptStream from '../lib/encryptStream';
import { GenerateFileKey, sha512HmacBuffer } from "../lib/crypto";
import { FunnelStream } from "../lib/funnelStream";
import { getShardMeta, ShardMeta } from '../lib/shardMeta';
import { ContractNegotiated } from '../lib/contracts';
import { logger } from "../lib/utils/logger";

import { ExchangeReport } from "./reports";
import { Shard } from "./shard";
import { promisifyStream } from '../lib/utils/promisify';

export interface FileMeta {
  size: number;
  name: string;
  content: Readable;
}

export class FileObjectUpload {
  private config: EnvironmentConfig;
  private fileMeta: FileMeta;

  bucketId: string;
  frameId: string;
  index: Buffer;

  encrypted: boolean = false;

  cipher: EncryptStream;
  uploadStream: EncryptStream;
  funnel: FunnelStream;
  fileEncryptionKey: Buffer;

  constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string)  {
    this.config = config;
    this.index = Buffer.alloc(0);
    this.fileMeta = fileMeta;
    this.bucketId = bucketId;
    this.frameId = '';
    this.funnel = new FunnelStream(utils.determineShardSize(fileMeta.size));
    this.cipher = new EncryptStream(randomBytes(32), randomBytes(16));
    this.uploadStream = new EncryptStream(randomBytes(32), randomBytes(16));
    this.fileEncryptionKey = randomBytes(32);
  }

  getSize(): number {
    return this.fileMeta.size;
  }

  async init(): Promise<FileObjectUpload> {
    this.index = randomBytes(32);
    this.fileEncryptionKey = await GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index);

    this.cipher = new EncryptStream(this.fileEncryptionKey, this.index.slice(0, 16));

    return this;
  }

  async checkBucketExistence(): Promise<boolean> {
    // if bucket not exists, bridge returns an error
    await api.getBucketById(this.config, this.bucketId);

    logger.info('Bucket %s exists', this.bucketId);

    return true;
  }

  stage(): Promise<void> {
    return api.createFrame(this.config).then((frame) => {
      if (!frame || !frame.id) {
        throw new Error('Bridge frame staging error');
      }

      this.frameId = frame.id;

      logger.info('Staged a file with frame %s', this.frameId);
    });
  }

  SaveFileInNetwork(bucketEntry: api.CreateEntryFromFrameBody): Promise<void | api.CreateEntryFromFrameResponse> {
    return api.createEntryFromFrame(this.config, this.bucketId, bucketEntry);
  }

  negotiateContract(frameId: string, shardMeta: ShardMeta): Promise<void | ContractNegotiated> {
    return api.addShardToFrame(this.config, frameId, shardMeta);
  }

  async NodeRejectedShard(encryptedShard: Buffer, shard: Shard): Promise<boolean> {
    await api.sendShardToNode(this.config, shard, encryptedShard);

    return false;
  }

  GenerateHmac(shardMetas: ShardMeta[]): string {
    const hmac = sha512HmacBuffer(this.fileEncryptionKey);

    for (const shardMeta of shardMetas) {
      hmac.update(Buffer.from(shardMeta.hash, 'hex'));
    }

    return hmac.digest().toString('hex');
  }

  encrypt(): EncryptStream {
    this.uploadStream = this.fileMeta.content.pipe(this.funnel).pipe(this.cipher);
    this.encrypted = true;

    return this.uploadStream;
  }

  async upload(callback: UploadProgressCallback): Promise<ShardMeta[]> {
    if (!this.encrypted) {
      throw new Error('Tried to upload a file not encrypted. Use .encrypt() before upload()');
    }

    let shardIndex = 0;
    
    const uploads: Promise<ShardMeta>[] = [];

    this.uploadStream.on('data', (shard: Buffer) => {
      uploads.push(this.uploadShard(shard, shard.length, this.frameId, shardIndex++, 3, false));
    });

    await promisifyStream(this.uploadStream);

    const fileSize = this.getSize();

    logger.debug('Shards obtained %s, shardSize %s', Math.ceil(fileSize / utils.determineShardSize(fileSize)), utils.determineShardSize(fileSize));

    let currentBytesUploaded = 0;
    const uploadResponses = await Promise.all(
      uploads.map(async (request) => {
        const shardMeta = await request;

        currentBytesUploaded = updateProgress(fileSize, currentBytesUploaded, shardMeta.size, callback);

        return shardMeta;
      })
    ).catch((err) => {
      const wrappedError = new Error('Farmer request error: ' + err.message);
      wrappedError.stack = err.stack;
      wrappedError.name = err.name;

      throw wrappedError;
    });

    return uploadResponses;
  }

  async uploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number, parity: boolean): Promise<ShardMeta> {
    const shardMeta: ShardMeta = getShardMeta(encryptedShard, shardSize, index, parity);

    logger.info('Uploading shard %s index %s size %s parity %s', shardMeta.hash, shardMeta.index, shardMeta.size, parity);

    try {
      let negotiatedContract: ContractNegotiated | void = await this.negotiateContract(frameId, shardMeta);

      if (!negotiatedContract) {
        throw new Error('Unable to receive storage offer');
      }

      const token = negotiatedContract.token;
      const operation = negotiatedContract.operation;
      const farmer = { ...negotiatedContract.farmer, lastSeen: new Date() };

      logger.debug('Contract for shard %s (index %s, size %s) with token %s',
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
      if (attemps > 1) {
        logger.error('Upload for shard %s failed. Reason %s. Retrying ...', shardMeta.hash, err.message);
        await this.uploadShard(encryptedShard, shardSize, frameId, index, --attemps, parity);
      } else {
        const wrappedError = Error('Upload shard error: ' + err.message);
        wrappedError.stack = err.stack;
        wrappedError.name = err.name;

        return Promise.reject(wrappedError);
      }
    }

    logger.info('Shard %s uploaded succesfully', shardMeta.hash);

    return shardMeta;
  }

}

function updateProgress(totalBytes: number, currentBytesUploaded: number, newBytesUploaded: number, progress: UploadProgressCallback): number {
  const newCurrentBytes = currentBytesUploaded + newBytesUploaded;
  const progressCounter = Math.ceil((newCurrentBytes / totalBytes) * 100);
  progress(progressCounter, newCurrentBytes, totalBytes);

  return newCurrentBytes;
}