import * as Winston from 'winston';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { doUntil, eachLimit, retry } from 'async';

import DecryptStream from "../lib/decryptstream";
import FileMuxer from "../lib/filemuxer";
import { GenerateFileKey } from "../lib/crypto";

import { FileInfo, GetFileInfo, GetFileMirrors, GetFileMirror, ReplacePointer } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { Shard } from "./shard";
import { ExchangeReport } from './reports';
import { Decrypt, Download, FILEMUXER } from '../lib/events';
import { logger } from '../lib/utils/logger';
import { DEFAULT_INXT_MIRRORS, DOWNLOAD_CANCELLED, DOWNLOAD_CANCELLED_ERROR } from './constants';
import { wrap } from '../lib/utils/error';
import { drainStream } from '../lib/utils/stream';
import { ShardObject } from './ShardObject';
import { Bridge, InxtApiI } from '../services/api';

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

  decipher: DecryptStream;

  private aborted = false;
  private debug: Winston.Logger;
  private api: InxtApiI;

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string, debug: Winston.Logger) {
    super();
    this.config = config;
    this.bucketId = bucketId;
    this.fileId = fileId;
    this.debug = debug;
    this.fileKey = Buffer.alloc(0);
    this.decipher = new DecryptStream(randomBytes(32), randomBytes(16));

    this.api = new Bridge(config);

    this.once(DOWNLOAD_CANCELLED, this.abort.bind(this));

    // DOWNLOAD_CANCELLED attach one listener per concurrent download
    this.setMaxListeners(100);
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

  TryDownloadShardWithFileMuxer(shard: Shard, excluded: string[] = []): Promise<Buffer> {
    this.checkIfIsAborted();

    logger.info('Downloading shard %s from farmer %s', shard.index, shard.farmer.nodeID);

    const exchangeReport = new ExchangeReport(this.config);

    return new Promise((resolve, reject) => {
      retry({ times: this.config.config?.shardRetry || 3, interval: 1000 }, async (nextTry: any) => {
        exchangeReport.params.exchangeStart = new Date();
        exchangeReport.params.farmerId = shard.farmer.nodeID;
        exchangeReport.params.dataHash = shard.hash;

        let downloadHasError = false;
        let downloadError: Error | null = null;
        let downloadCancelled = false;

        const oneFileMuxer = new FileMuxer({ shards: 1, length: shard.size });
        const shardObject = new ShardObject(this.api, '', null, shard);

        let buffs: Buffer[] = [];
        let downloaderStream: Readable;

        this.once(DOWNLOAD_CANCELLED, () => {
          buffs = [];
          downloadCancelled = true;

          if (downloaderStream) {
            downloaderStream.destroy();
          }
        });

        oneFileMuxer.on(FILEMUXER.PROGRESS, (msg) => this.emit(FILEMUXER.PROGRESS, msg));
        oneFileMuxer.on('error', (err) => {
          if (err.message === DOWNLOAD_CANCELLED_ERROR) {
            return;
          }

          downloadHasError = true;
          downloadError = err;
          this.emit(FILEMUXER.ERROR, err);

          exchangeReport.DownloadError();
          exchangeReport.sendReport().catch(() => null);

          oneFileMuxer.emit('drain');
        });

        oneFileMuxer.on('data', (data: Buffer) => { buffs.push(data); });

        oneFileMuxer.once('drain', () => {
          logger.info('Drain received for shard %s', shard.index);

          if (downloadCancelled) {
            nextTry(null, Buffer.alloc(0));

            return;
          }

          if (downloadHasError) {
            nextTry(downloadError);
          } else {
            exchangeReport.DownloadOk();
            exchangeReport.sendReport().catch(() => null);

            nextTry(null, Buffer.concat(buffs));
          }
        });

        downloaderStream = await shardObject.download();
        oneFileMuxer.addInputSource(downloaderStream, shard.size, Buffer.from(shard.hash, 'hex'), null);

      }, async (err: Error | null | undefined, result: Buffer | undefined) => {
        try {
          if (!err) {
            if (result) {
              return resolve(result);
            }

            return reject(wrap('Empty result from downloading shard', new Error('')));
          }
          logger.warn('It seems that shard %s download from farmer %s went wrong. Replacing pointer', shard.index, shard.farmer.nodeID);

          excluded.push(shard.farmer.nodeID);

          const newShard = await GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded);

          if (!newShard[0].farmer) {
            return reject(wrap('File missing shard error', err));
          }

          const buffer = await this.TryDownloadShardWithFileMuxer(newShard[0], excluded);

          return resolve(buffer);
        } catch (err) {
          return reject(err);
        }
      });
    });
  }

  download(): Readable {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo');
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))
      .on(Decrypt.Progress, (msg) => {
        this.emit(Decrypt.Progress, msg);
      })
      .on('error', (err) => {
        this.emit(Decrypt.Error, err);
      });

    eachLimit(this.rawShards, 1, async (shard, cb) => {
      let error;
      try {
        if (shard.healthy === false) {
          throw new Error('Bridge request pointer error');
        }

        const shardBuffer = await this.TryDownloadShardWithFileMuxer(shard);

        logger.info('Shard %s downloaded OK', shard.index);

        this.emit(Download.Progress, shardBuffer.length);

        if (!this.decipher.write(shardBuffer)) {
          // backpressuring to avoid congestion for excessive buffering
          await drainStream(this.decipher);
        }
      } catch (err) {
        error = err;
      } finally {
        if (error) {
          cb(wrap('Download shard error', error));
        } else {
          cb();
        }
      }
    }, () => {
      this.decipher.end();
    });

    return this.decipher;
  }

  abort(): void {
    this.debug.info('Aborting file upload');
    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }
}
