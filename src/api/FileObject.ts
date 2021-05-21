import { randomBytes } from 'crypto';
import { Duplex, Readable } from 'stream';
import { EventEmitter } from 'events';
import { eachLimit, retry } from 'async';


import DecryptStream from "../lib/decryptstream";
import FileMuxer from "../lib/filemuxer";
import { GenerateFileKey } from "../lib/crypto";

import { ShardObject } from "./ShardObject";
import { FileInfo, GetFileInfo, GetFileMirrors, GetFileMirror } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { Shard } from "./shard";
import { ExchangeReport } from './reports';
import { DECRYPT, DOWNLOAD, FILEMUXER, FILEOBJECT } from '../lib/events';
import { utils } from 'rs-wrapper';
import { logger } from '../lib/utils/logger';
import { bufferToStream } from '../lib/utils/buffer';

const MultiStream = require('multistream');

function BufferToStream(buffer: Buffer): Duplex {
  const stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

interface DownloadStream {
  content: Readable, 
  index: number
}

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

  totalSizeWithECs = 0;

  decipher: DecryptStream;

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string) {
    super();
    this.config = config;
    this.bucketId = bucketId;
    this.fileId = fileId;
    this.fileKey = Buffer.alloc(0);
    this.decipher = new DecryptStream(randomBytes(32), randomBytes(16));
  }

  async GetFileInfo(): Promise<FileInfo | undefined> {
    if (!this.fileInfo) {
      this.fileInfo = await GetFileInfo(this.config, this.bucketId, this.fileId);
      if (this.config.encryptionKey) {
        this.fileKey = await GenerateFileKey(this.config.encryptionKey, this.bucketId, Buffer.from(this.fileInfo.index, 'hex'));
      }
    }
    return this.fileInfo;
  }

  async GetFileMirrors(): Promise<void> {
    this.rawShards = await GetFileMirrors(this.config, this.bucketId, this.fileId);

    this.rawShards.forEach((shard) => {
      if (!shard.farmer || !shard.farmer.nodeID || !shard.farmer.port || !shard.farmer.address) {
        shard.healthy = false;
        return;
      }
      
      shard.farmer.address = shard.farmer.address.trim();
    });

    this.length = this.rawShards.reduce((a, b) => { return { size: a.size + b.size }; }, { size: 0 }).size;
    this.final_length = this.rawShards.filter(x => x.parity === false).reduce((a, b) => { return { size: a.size + b.size }; }, { size: 0 }).size;
  }

  StartDownloadShard(index: number): FileMuxer {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo');
    }

    const shardIndex = this.rawShards.map(x => x.index).indexOf(index);
    const shard = this.rawShards[shardIndex];

    const fileMuxer = new FileMuxer({ shards: 1, length: shard.size });

    const shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId);
    
    shardObject.StartDownloadShard().then((reqStream: Readable) => {
      fileMuxer.addInputSource(reqStream, shard.size, Buffer.from(shard.hash, 'hex'), null);
    });

    return fileMuxer;
  }

  async TryDownloadShardWithFileMuxer(shard: Shard, excluded: string[] = []): Promise<Buffer> {
    const exchangeReport = new ExchangeReport(this.config);

    return new Promise((resolve, reject) => {
      retry({ times: this.config.config?.shardRetry || 3, interval: 1000 }, async (nextTry: any) => {
        exchangeReport.params.exchangeStart = new Date();
        exchangeReport.params.farmerId = shard.farmer.nodeID;
        exchangeReport.params.dataHash = shard.hash;

        let downloadHasError = false;
        let downloadError: Error | null = null;

        const oneFileMuxer = new FileMuxer({ shards: 1, length: shard.size });
        const shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId);

        oneFileMuxer.on(FILEMUXER.PROGRESS, (msg) => this.emit(FILEMUXER.PROGRESS, msg));
        oneFileMuxer.on('error', (err) => {
          downloadHasError = true;
          downloadError = err;
          this.emit(FILEMUXER.ERROR, err);

          // Should emit Exchange Report?
          exchangeReport.DownloadError();
          // exchangeReport.sendReport().catch((err) => { err; });

          // Force to finish this attempt
          logger.info('Emitting drain for shard %s', shard.index);

          oneFileMuxer.emit('drain');
        });

        const buffs: Buffer[] = [];
        oneFileMuxer.on('data', (data: Buffer) => { buffs.push(data); });

        oneFileMuxer.once('drain', () => {
          logger.info('Drain received for shard %s', shard.index);

          if (downloadHasError) {
            nextTry(downloadError);
          } else {
            exchangeReport.DownloadOk();
            // exchangeReport.sendReport().catch((err) => { err; });

            nextTry(null, Buffer.concat(buffs));
          }
        });

        const downloaderStream = await shardObject.StartDownloadShard();
        oneFileMuxer.addInputSource(downloaderStream, shard.size, Buffer.from(shard.hash, 'hex'), null);

      }, async (err: Error | null | undefined, result: any) => {
        try {
          if (!err && result) {
            return resolve(result);
          } else {
            logger.warn('It seems that shard %s download went wrong. Retrying', shard.index);

            excluded.push(shard.farmer.nodeID);

            const newShard = await GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded);

            if (!newShard[0].farmer) {
              return reject(Error('File missing shard error'));
            }

            const buffer = await this.TryDownloadShardWithFileMuxer(newShard[0], excluded);
            return resolve(buffer);
          }
        } catch (err) {
          return reject(err);
        }
      });
    });

  }

  async StartDownloadFile2(): Promise<any> {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo');
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16));

    this.decipher.on('error', (err) => this.emit(DECRYPT.ERROR, err));
    this.decipher.on(DECRYPT.PROGRESS, (msg) => this.emit(DECRYPT.PROGRESS, msg));

    let shardSize = utils.determineShardSize(this.final_length);

    const lastShardIndex = this.rawShards.filter(shard => !shard.parity).length - 1;
    const lastShardSize = this.rawShards[lastShardIndex].size; 
    const sizeToFillToZeroes = shardSize - lastShardSize;

    logger.info('%s bytes to be added with zeroes for the last shard', sizeToFillToZeroes);

    let streams: DownloadStream[] = [];

    setInterval(() => {
      console.log("shards number %s, but downloaded %s", this.rawShards.length, streams.length);
    }, 10000);

    console.time('download-time');

    await Promise.all(this.rawShards.map(async (shard, i) => {
      try {
        console.log('SHARD HEALTHY', shard.healthy);

        if (shard.healthy === false) {
          throw new Error('Bridge request pointer error');
        }

        logger.info('Downloading shard %s', shard.index);

        const shardBuffer = await this.TryDownloadShardWithFileMuxer(shard);
        let content = shardBuffer;

        logger.info('Shard %s downloaded OK', shard.index);
        this.emit(DOWNLOAD.PROGRESS, shardBuffer.length);

        if (i === lastShardIndex && sizeToFillToZeroes > 0) {
          logger.info('Filling with zeroes last shard');

          content = Buffer.concat([content, Buffer.alloc(sizeToFillToZeroes).fill(0)]);

          logger.info('After filling with zeroes, shard size is %s', content.length);
        }

        streams.push({
          content: bufferToStream(content),
          index: shard.index
        });

        shard.healthy = true;
      } catch (err) {
        logger.error('Error downloading shard %s reason %s', shard.index, err.message);
        console.error(err);

        // Fake shard and continue with the next
        streams.push({
          content: bufferToStream(Buffer.alloc(shardSize).fill(0)),
          index: shard.index
        })

        shard.healthy = false;
      } 
    }));

    console.timeEnd('download-time');

    // JOIN STREAMS IN ORDER
    streams.sort((sA, sB) => sA.index - sB.index);

    // RETURN ONE STREAM UNIFIED
    return new MultiStream(streams.map(s => s.content));
  }

  StartDownloadFile(): FileMuxer {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo');
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16));

    this.decipher.on('error', (err) => this.emit(DECRYPT.ERROR, err));
    this.decipher.on(DECRYPT.PROGRESS, (msg) => this.emit(DECRYPT.PROGRESS, msg));

    const fileMuxer = new FileMuxer({
      shards: this.rawShards.length,
      length: this.rawShards.reduce((a, b) => { return { size: a.size + b.size }; }, { size: 0 }).size
    });

    fileMuxer.on('error', (err) => this.emit('download-filemuxer-error', err));
    fileMuxer.on(FILEMUXER.PROGRESS, (msg) => this.emit(FILEMUXER.PROGRESS, msg));

    let shardObject;
    let shardSize = utils.determineShardSize(this.final_length);

    const lastShardIndex = this.rawShards.filter(shard => !shard.parity).length - 1;
    const lastShardSize = this.rawShards[lastShardIndex].size; 
    const sizeToFillToZeroes = shardSize - lastShardSize;
    let currentShard = 0;

    eachLimit(this.rawShards, 1, async (shard, nextItem) => {
      if (!shard) {
        return nextItem(new Error("Shard is null"));
      }

      shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId);
      this.shards.push(shardObject);

      // We add the stream buffer to the muxer, and will be downloaded to the main stream.
      // We should download the shard isolated, and check if its ok.
      // If it fails, try another mirror.
      // If its ok, add it to the muxer.
      try {
        const shardBuffer = await this.TryDownloadShardWithFileMuxer(shard);
        
        logger.info('Download with file muxer finished succesfully, buffer length %s', shardBuffer.length);
          
        fileMuxer.once('drain', () => {
            // fill to zeroes last shard
            if (currentShard === lastShardIndex) {
              if (sizeToFillToZeroes > 0) {
                logger.info('Last shard size is not standard shard size, size to fill to zeroes %s', sizeToFillToZeroes);

                const buf = Buffer.alloc(sizeToFillToZeroes).fill(0);
                let start = 0;
                const chunkSize = 65536;
                const len = buf.length;

                while (fileMuxer.push(
                  buf.slice(start, (start += chunkSize))
                )) {
                  // If all data pushed, just break the loop.
                  if (start >= len) {
                    // fileMuxer.push(null)
                    break
                  }
                }
                
              }
            }
            
            console.log('draining')
            this.emit(DOWNLOAD.PROGRESS, shardBuffer.length);

            shard.healthy = true;
            // currentShard++;

            nextItem();
          });

        fileMuxer.addInputSource(BufferToStream(shardBuffer), shard.size, Buffer.from(shard.hash, 'hex'), null, 5)

      } catch (err) {
        logger.warn('Shard download failed. Reason: %s', err.message);
        shard.healthy = false;
        // currentShard++;

        nextItem();  
      } 
      
      
      // this.TryDownloadShardWithFileMuxer(shard).then((shardBuffer: Buffer) => {
      //   logger.info('Download with file muxer finished succesfully');

      //   fileMuxer.addInputSource(bufferToStream(shardBuffer), shard.size, Buffer.from(shard.hash, 'hex'), null)
      //     .once('error', (err) => { throw err; })
      //     .once('drain', () => {
      //       console.log('here drain');

      //       this.emit(DOWNLOAD.PROGRESS, shardBuffer.length);
      //       shard.healthy = true;

      //       nextItem();
      //     });

      // }).catch((err) => {
      //   logger.warn('Shard download failed. Reason: %s', err.message);

      //   const fakeHash = Buffer.alloc(40).fill(0).toString('hex')
      //   fileMuxer.addInputSource(bufferToStream(Buffer.alloc(shardSize).fill(0)), shard.size, Buffer.from(fakeHash, 'hex'), null);
      //   shard.healthy = false;

      //   nextItem();
      // }).finally(() => {
      //   logger.warn("Downloading next shard");
      // })

    }, (err: Error | null | undefined) => {
      this.shards.forEach(shard => { this.totalSizeWithECs += shard.shardInfo.size; });
      this.emit('end', err);
    });

    return fileMuxer;
  }

  /*
  private updateGlobalPercentage(): void {
    const result = { totalBytesDownloaded: 0, totalSize: this.totalSizeWithECs, totalShards: this.shards.length, shardsCompleted: 0 }
    eachSeries(this.shards.keys(), (shardIndex, nextShard) => {
      const shard = this.shards[shardIndex]
      if (!shard) { return nextShard() }
      if (shard.isFinished()) { result.shardsCompleted++ }
      nextShard()
    }, () => {
      if (result.totalBytesDownloaded === result.totalSize) {
        this.emit('download-end')
      }
      const percentage = result.totalBytesDownloaded / (result.totalSize || 1)
      this.emit('progress', result.totalBytesDownloaded, result.totalSize, percentage)
    })
  }
  */
}
