import { eachLimit, ErrorCallback, queue } from "async";
import { createDecipheriv } from "crypto";
import { Readable } from "stream";

import { Abortable } from "../../api/Abortable";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
import { determineConcurrency } from "../utils";
import { wrap } from "../utils/error";
import { logger } from "../utils/logger";
import { DownloadEvents, DownloadStrategy } from "./DownloadStrategy";

export class MultipleStreamsStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];

  async download(mirrors: Shard[]): Promise<void> {
    const concurrency = determineConcurrency(200 * 1024 * 1024, mirrors.reduce((acumm, mirror) => mirror.size + acumm, 0));

    try {
      this.emit(DownloadEvents.Start);

      const decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const downloadStreamsRefs: { index: number, stream: Readable }[] = [];

      await eachLimit(mirrors, 6, (mirror, next) => {
        getDownloadStream(mirror).then((downloadStream) => {
          downloadStreamsRefs.push({
            index: mirror.index,
            stream: downloadStream
          });
          next();
        }).catch((err) => {
          next(err);
        });
      });

      console.log('real download starts');

      const downloadsBuffer: { index: number, content: Buffer } [] = [];
      let currentShardIndex = 0;

      const decryptingTask = (shardEncrypted: Buffer) => {
        return new Promise((resolve) => {
          if (!decipher.write(shardEncrypted)) {
            decipher.once('drain', resolve);
          } else {
            resolve(null);
          } 
        });
      };

      const decryptQueue = queue((encryptedShard: Buffer, cb: ErrorCallback<Error>) => {
        decryptingTask(encryptedShard).then(() => {
          cb()
        }).catch(cb);
      }, 1);

      setInterval(() => {
        const downloadedShardIndex = downloadsBuffer.findIndex(download => download.index === currentShardIndex);
        const shardReady = downloadedShardIndex !== -1;

        // console.log('Interval check: currentShardIndex is %s. DownloadedShardIndex is %s', currentShardIndex, downloadedShardIndex);
        // console.log('DOWNLOADS', JSON.stringify(downloadsBuffer.map(d => ({ index: d.index, content: d.content.slice(0, 4).toString('hex') })), null, 2));
        
        if (shardReady) {
          const isLastShard = currentShardIndex === mirrors.length - 1;
          if (isLastShard) {
            decryptQueue.push(downloadsBuffer[downloadedShardIndex].content, () => {
              decipher.end();
            });
          } else {
            decryptQueue.push(downloadsBuffer[downloadedShardIndex].content);
          }
          
          downloadsBuffer[downloadedShardIndex].content = Buffer.alloc(0);
          currentShardIndex++;
        }
      }, 2000);

      const downloadTask = (downloadStream: Readable): Promise<Buffer> => {
        const buffers: Buffer[] = [];

        return new Promise((resolve, reject) => {
          downloadStream.on('data', buffers.push.bind(buffers));
          downloadStream.once('error', reject);
          downloadStream.once('end', () => resolve(Buffer.concat(buffers)));          
        });
      }

      const downloadWorker = (downloadStreamRef: { stream: Readable, index: number }, cb: ErrorCallback<Error>) => {
        downloadTask(downloadStreamRef.stream).then((downloadedShard) => {
          logger.debug('Shard %s downloaded (size %s), pushing to downloads buffer', downloadStreamRef.index, downloadedShard.length);
          downloadsBuffer.push({ index: downloadStreamRef.index, content: downloadedShard });
          cb();
        }).catch(cb);
      }

      const downloadQueue = queue(downloadWorker, concurrency);

      downloadStreamsRefs.sort((a, b) => a.index - b.index);
      downloadStreamsRefs.forEach((ref) => {
        downloadQueue.push(ref);
      });

      this.emit(DownloadEvents.Ready, decipher);
    } catch (err) {
      console.log(err instanceof Error && err.stack);
      this.emit(DownloadEvents.Error, wrap('MultipleStreamsStrategyError', err as Error));
    }
  }

  abort(): void {
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(DownloadEvents.Abort);
  }
}

function getDownloadStream(shard: Shard): Promise<Readable> {
  return ShardObject.requestGet(buildRequestUrlShard(shard)).then(getStream);
}

function buildRequestUrlShard(shard: Shard) {
  const { address, port } = shard.farmer;

  return `http://${address}:${port}/download/link/${shard.hash}`;
}


export class MultipleStreamsStrategyTwo extends DownloadStrategy {
  private abortables: Abortable[] = [];

  async download(mirrors: Shard[]): Promise<void> {
    const concurrency = determineConcurrency(200 * 1024 * 1024, mirrors.reduce((acumm, mirror) => mirror.size + acumm, 0));

    try {
      this.emit(DownloadEvents.Start);

      const decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const downloadsBuffer: { index: number, content: Buffer } [] = [];

      const decryptQueue = queue((encryptedShard: Buffer, cb: ErrorCallback<Error>) => {
        if (!decipher.write(encryptedShard)) {
          return decipher.once('drain', () => cb());
        }
        cb();
      }, 1);

      const contractsQueue = queue(async (mirror: Shard, cb: ErrorCallback<Error>) => {
        try {
          const downloadStream = await getDownloadStream(mirror);
          const shardEncrypted = await bufferToStream(downloadStream);
          downloadsBuffer.push({ index: mirror.index, content: shardEncrypted });
        } catch (err) {
          cb(err as Error);
        }
      }, Math.round(concurrency / 2));
      
      let currentShardIndex = 0;

      setInterval(() => {
        const downloadedShardIndex = downloadsBuffer.findIndex(download => download.index === currentShardIndex);
        const shardReady = downloadedShardIndex !== -1;

        // console.log('Interval check: currentShardIndex is %s. DownloadedShardIndex is %s', currentShardIndex, downloadedShardIndex);
        // console.log('DOWNLOADS', JSON.stringify(downloadsBuffer.map(d => ({ index: d.index, content: d.content.slice(0, 4).toString('hex') })), null, 2));
        
        if (shardReady) {
          const isLastShard = currentShardIndex === mirrors.length - 1;
          if (isLastShard) {
            decryptQueue.push(downloadsBuffer[downloadedShardIndex].content, () => decipher.end());
          } else {
            decryptQueue.push(downloadsBuffer[downloadedShardIndex].content);
          }
          
          downloadsBuffer[downloadedShardIndex].content = Buffer.alloc(0);
          currentShardIndex++;
        }
      }, 2000);

      mirrors.map(m => contractsQueue.push(m));

      this.emit(DownloadEvents.Ready, decipher);
    } catch (err) {
      console.log(err instanceof Error && err.stack);
      this.emit(DownloadEvents.Error, wrap('MultipleStreamsStrategyError', err as Error));
    }
  }

  abort(): void {
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(DownloadEvents.Abort);
  }
}

function bufferToStream(r: Readable): Promise<Buffer> {
  const buffers: Buffer[] = [];

  return new Promise((resolve, reject) => {
    r.on('data', buffers.push.bind(buffers));
    r.once('error', reject);
    r.once('end', () => resolve(Buffer.concat(buffers)));          
  });
}