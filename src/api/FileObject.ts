import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { doUntil, eachLimit } from 'async';

import { GenerateFileKey } from "../lib/crypto";

import { FileInfo, GetFileInfo, GetFileMirrors, ReplacePointer } from "./fileinfo";
import { Shard, EnvironmentConfig } from "./";
import { logger } from '../lib/utils/logger';
import { DEFAULT_INXT_MIRRORS } from './constants';
import { wrap } from '../lib/utils/error';
import { ShardObject } from './ShardObject';
import { Bridge, InxtApiI } from '../services/api';
import { DownloadStrategy, Events } from '../lib/core';
import { Abortable } from './Abortable';

export class FileObject extends EventEmitter {
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

  private aborted = false;
  private api: InxtApiI;

  private downloader: DownloadStrategy;
  private abortables: Abortable[] = [];

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string, downloader: DownloadStrategy) {
    super();
    this.config = config;
    this.bucketId = bucketId;
    this.fileId = fileId;
    this.fileKey = Buffer.alloc(0);

    this.api = new Bridge(config);

    this.downloader = downloader;
    
    this.abortables.push({ abort: () => downloader.abort() });

    this.once(Events.Download.Abort, this.abort.bind(this));
  }

  setFileEncryptionKey(key: Buffer): void {
    this.fileKey = key;
  }

  setFileToken(token: string): void {
    this.fileToken = token;
  }

  checkIfIsAborted() {
    if (this.isAborted()) {
      this.emit(Events.Download.Error, new Error('Download aborted'));
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
    this.checkIfIsAborted();

    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo');
    }

    const fk = this.fileKey.slice(0, 32);
    const iv = Buffer.from(this.fileInfo.index, 'hex').slice(0, 16);

    this.downloader.setIv(iv);
    this.downloader.setFileEncryptionKey(fk);

    this.downloader.once(Events.Download.Abort, () => this.downloader.emit(Events.Download.Error, new Error('Download aborted')));
    this.downloader.on(Events.Download.Progress, (progress) => this.emit(Events.Download.Progress, progress));

    return new Promise((resolve, reject) => {
      this.downloader.once(Events.Download.Ready, resolve);
      this.downloader.once(Events.Download.Error, reject);
      this.downloader.download(this.rawShards.filter(s => !s.parity));
    });
  }

  abort(): void {
    this.aborted = true;
    this.abortables.forEach((abortable) => abortable.abort());
  }

  isAborted(): boolean {
    return this.aborted;
  }
}
