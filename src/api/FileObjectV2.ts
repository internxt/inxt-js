import * as Winston from 'winston';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { doUntil, eachLimit } from 'async';

import DecryptStream from "../lib/decryptstream";
import { GenerateFileKey } from "../lib/crypto";

import { FileInfo, GetFileInfo, GetFileMirrors, ReplacePointer } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { Shard } from "./shard";
import { logger } from '../lib/utils/logger';
import { DEFAULT_INXT_MIRRORS, DOWNLOAD_CANCELLED } from './constants';
import { wrap } from '../lib/utils/error';
import { ShardObject } from './ShardObject';
import { Bridge, InxtApiI } from '../services/api';
import { DownloadEvents, DownloadStrategy } from '../lib/download/DownloadStrategy';

export class FileObjectV2 extends EventEmitter {
  shards: ShardObject[] = [];
  rawShards: Shard[] = [];
  fileInfo: FileInfo | undefined;
  config: EnvironmentConfig;

  length = -1;
  final_length = -1;

  bucketId: string;
  fileId: string;

  fileKey: Buffer;
  fileToken?: string;

  totalSizeWithECs = 0;

  decipher: DecryptStream;

  private aborted = false;
  private debug: Winston.Logger;
  private api: InxtApiI;

  private downloader: DownloadStrategy;

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string, debug: Winston.Logger, downloader: DownloadStrategy) {
    super();
    this.config = config;
    this.bucketId = bucketId;
    this.fileId = fileId;
    this.debug = debug;
    this.fileKey = Buffer.alloc(0);
    this.decipher = new DecryptStream(randomBytes(32), randomBytes(16));

    this.api = new Bridge(config);

    this.downloader = downloader;

    this.once(DOWNLOAD_CANCELLED, this.abort.bind(this));
  }

  setFileEncryptionKey(key: Buffer): void {
    this.fileKey = key;
  }

  setFileToken(token: string): void {
    this.fileToken = token;
  }

  checkIfIsAborted() {
    if (this.isAborted()) {
      throw new Error('Download aborted');
    }
  }

  async getInfo(): Promise<FileInfo | undefined> {
    this.checkIfIsAborted();

    logger.info('Retrieving file info...');

    if (!this.fileInfo) {
      this.fileInfo = await GetFileInfo(this.config, this.bucketId, this.fileId, this.fileToken)
        .catch((err) => {
          throw wrap('Get file info error', err);
        });
      if (this.fileKey.length === 0 && this.config.encryptionKey) {
        this.fileKey = await GenerateFileKey(this.config.encryptionKey, this.bucketId, Buffer.from(this.fileInfo.index, 'hex'))
          .catch((err) => {
            throw wrap('Generate file key error', err);
          });
      }
    }

    return this.fileInfo;
  }

  async getMirrors(): Promise<void> {
    this.checkIfIsAborted();

    logger.info('Retrieving file mirrors...');

    // Discard mirrors for shards with parities (ECs)
    this.rawShards = (await GetFileMirrors(this.config, this.bucketId, this.fileId, this.fileToken)).filter(shard => !shard.parity);

    await eachLimit(this.rawShards, 1, (shard: Shard, nextShard) => {
      let attempts = 0;

      const farmerIsOk = shard.farmer && shard.farmer.nodeID && shard.farmer.port && shard.farmer.address;

      if (farmerIsOk) {
        shard.farmer.address = shard.farmer.address.trim();

        return nextShard(null);
      }

      logger.warn('Pointer for shard %s failed, retrieving a new one', shard.index);

      let validPointer = false;

      doUntil((next: (err: Error | null, result: Shard | null) => void) => {
        ReplacePointer(this.config, this.bucketId, this.fileId, shard.index, []).then((newShard) => {
          next(null, newShard[0]);
        }).catch((err) => {
          next(err, null);
        }).finally(() => {
          attempts++;
        });
      }, (result: Shard | null, next: any) => {
        validPointer = result && result.farmer && result.farmer.nodeID && result.farmer.port && result.farmer.address ? true : false;

        return next(null, validPointer || attempts >= DEFAULT_INXT_MIRRORS);
      }).then((result: any) => {
        logger.info('Pointer replaced for shard %s', shard.index);

        if (!validPointer) {
          throw new Error(`Missing pointer for shard ${shard.hash}`);
        }

        result.farmer.address = result.farmer.address.trim();

        this.rawShards[shard.index] = result;

        nextShard(null);
      }).catch((err) => {
        nextShard(wrap('Bridge request pointer error', err));
      });
    });

    this.length = this.rawShards.reduce((a, b) => { return { size: a.size + b.size }; }, { size: 0 }).size;
    this.final_length = this.rawShards.filter(x => x.parity === false).reduce((a, b) => { return { size: a.size + b.size }; }, { size: 0 }).size;
  }

  download(): Promise<Readable> {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo');
    }

    const fk = this.fileKey.slice(0, 32);
    const iv = Buffer.from(this.fileInfo.index, 'hex').slice(0, 16);

    this.downloader.setIv(iv);
    this.downloader.setFileEncryptionKey(fk);

    this.downloader.once(DownloadEvents.Abort, () => this.downloader.emit(DownloadEvents.Error, new Error('Download aborted')));
    this.downloader.on(DownloadEvents.Progress, (progress) => this.emit(DownloadEvents.Progress, progress));

    return new Promise((resolve, reject) => {
      this.downloader.once(DownloadEvents.Ready, resolve);
      this.downloader.once(DownloadEvents.Error, (err) => {
        reject(err);
        this.removeAllListeners();
      });

      this.downloader.download(this.rawShards.filter(s => !s.parity));
    });
  }

  abort(): void {
    this.debug.info('Aborting file upload');
    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }
}