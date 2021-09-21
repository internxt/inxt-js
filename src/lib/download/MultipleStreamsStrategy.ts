import { ErrorCallback, queue } from "async";
import { createDecipheriv } from "crypto";
import { Readable } from "stream";

import { Abortable } from "../../api/Abortable";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
import { determineConcurrency } from "../utils";
import { wrap } from "../utils/error";
import { DownloadEvents, DownloadStrategy } from "./DownloadStrategy";

function getDownloadStream(shard: Shard, cb: (err: Error | null, stream: Readable | null) => void): void {
  ShardObject.requestGet(buildRequestUrlShard(shard)).then(getStream).then((stream) => {
    cb(null, stream);
  }).catch((err) => {
    cb(err, null);
  });
}

function buildRequestUrlShard(shard: Shard) {
  const { address, port } = shard.farmer;

  return `http://${address}:${port}/download/link/${shard.hash}`;
}


export class MultipleStreamsStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];

  async download(mirrors: Shard[]): Promise<void> {
    const concurrency = determineConcurrency(1000 * 1024 * 1024, mirrors.reduce((acumm, mirror) => mirror.size + acumm, 0));

    console.log('concurrency', concurrency);

    try {
      this.emit(DownloadEvents.Start);

      const decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const downloadsBuffer: { index: number, content: Buffer } [] = [];

      const decryptQueue = queue((encryptedShard: Buffer, cb: ErrorCallback<Error>) => {
        console.log('writing in disk');
        if (!decipher.write(encryptedShard)) {
          console.log('waiting for drain');
          return decipher.once('drain', () => {
            console.log('drain ready!');
            cb();
          });
        }
        console.log('not waiting for drain');
        cb();
      }, 1);

      let currentShardIndex = 0;

      const checkShardsPendingToDecrypt = () => {
        let downloadedShardIndex = downloadsBuffer.findIndex(download => download.index === currentShardIndex);
        const shardReady = downloadedShardIndex !== -1;

        if (!shardReady) {
          return;
        }

        const isLastShard = currentShardIndex === mirrors.length - 1;

        if (isLastShard) {
          decryptQueue.push(downloadsBuffer[downloadedShardIndex].content, () => decipher.end());
          downloadsBuffer[downloadedShardIndex].content = Buffer.alloc(0);

          return;
        }

        let shardsAvailable = true;

        while (!shardsAvailable) {
          downloadedShardIndex = downloadsBuffer.findIndex(d => d.index === currentShardIndex);

          if (downloadedShardIndex !== -1) {
            decryptQueue.push(downloadsBuffer[downloadedShardIndex].content);
            downloadsBuffer[downloadedShardIndex].content = Buffer.alloc(0);
            currentShardIndex++;
          } else {
            shardsAvailable = false;
          }
        }
      };

      const contractsQueue = queue((mirror: Shard, next: ErrorCallback<Error>) => {
        console.log('processing shard for mirror %s', mirror.index);
        getDownloadStream(mirror, (err, downloadStream) => {
          console.log('i got the download stream for mirror %s', mirror.index);
          if (err) {
            return next(err);
          }
          bufferToStream(downloadStream as Readable, (toStreamErr, res) => {
            console.log('i got the buffer for mirror %s', mirror.index);
            if (toStreamErr) {
              return next(toStreamErr);
            }
            downloadsBuffer.push({ index: mirror.index, content: res as Buffer });
            // res = null; // free memory
            next();
          });
        });
      }, Math.round(concurrency / 2));

      mirrors.forEach(m => contractsQueue.push(m, () => checkShardsPendingToDecrypt()));

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

function bufferToStream(r: Readable, cb: (err: Error | null, res: Buffer | null) => void): void {
  const buffers: Buffer[] = [];

  r.on('data', buffers.push.bind(buffers));
  r.once('error', (err) => {
    console.log('err', err);
    cb(err, null);
  });
  r.once('end', () => cb(null, Buffer.concat(buffers)));
}