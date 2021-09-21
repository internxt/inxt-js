import { ErrorCallback, queue } from "async";
import { createDecipheriv } from "crypto";
import { Readable } from "stream";

import { Abortable } from "../../api/Abortable";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
import { BytesCounter, ProgressNotifier, Events as ProgressEvents } from "../streams";
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
  private progressCoefficients = {
    download: 0.9,
    decrypt: 0.1
  }

  constructor() {
    super();

    if ((this.progressCoefficients.download + this.progressCoefficients.decrypt) !== 1) {
      throw new Error('Progress coefficients are wrong');
    }
  }

  async download(mirrors: Shard[]): Promise<void> {
    const fileSize = mirrors.reduce((acumm, mirror) => mirror.size + acumm, 0);
    const concurrency = determineConcurrency(200 * 1024 * 1024, fileSize);

    console.log('concurrency', concurrency);

    try {
      this.emit(DownloadEvents.Start);

      const decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const downloadsBuffer: { index: number, content: Buffer } [] = [];

      const decryptQueue = queue((encryptedShard: Buffer, cb: ErrorCallback<Error>) => {
        if (decipher.write(encryptedShard)) {
          return cb();
        }
        decipher.once('drain', cb);
      }, 1);

      let currentShardIndex = 0;

      const checkShardsPendingToDecrypt = () => {
        let downloadedShardIndex = downloadsBuffer.findIndex(download => download.index === currentShardIndex);
        const shardReady = downloadedShardIndex !== -1;

        console.log('shard ready??', shardReady);

        if (!shardReady) {
          return;
        }

        console.log('currentshardIndex is %s', currentShardIndex);

        let shardsAvailable = true;
        let isLastShard = false;

        while (shardsAvailable) {
          downloadedShardIndex = downloadsBuffer.findIndex(d => d.index === currentShardIndex);
          console.log('download found', downloadedShardIndex !== -1);

          if (downloadedShardIndex !== -1) {
            isLastShard = currentShardIndex === mirrors.length - 1;

            console.log('is last shard', isLastShard);

            decryptQueue.push(downloadsBuffer[downloadedShardIndex].content, isLastShard ? () => decipher.end() : () => null);
            downloadsBuffer[downloadedShardIndex].content = Buffer.alloc(0);

            currentShardIndex++;
          } else {
            shardsAvailable = false;
          }
        }   
      };

      const downloadsProgress: number[] = new Array(mirrors.length).fill(0);

      setInterval(() => {
        this.emit(DownloadEvents.Progress, (
          downloadsProgress.reduce((acumm, progress) => acumm + progress, 0) * 
          this.progressCoefficients.download
        ));
      }, 5000);

      const contractsQueue = queue((mirror: Shard, next: ErrorCallback<Error>) => {
        console.log('processing shard for mirror %s', mirror.index);
        getDownloadStream(mirror, (err, downloadStream) => {
          console.log('i got the download stream for mirror %s', mirror.index);
          if (err) {
            return next(err);
          }

          const progressNotifier = new ProgressNotifier(fileSize, 2000);

          progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
            downloadsProgress[mirror.index] = progress;
          });

          bufferToStream((downloadStream as Readable).pipe(progressNotifier), (toStreamErr, res) => {
            console.log('i got the buffer for mirror %s', mirror.index);
            if (toStreamErr) {
              return next(toStreamErr);
            }
            downloadsBuffer.push({ index: mirror.index, content: res as Buffer });
            progressNotifier.destroy();
            (downloadStream as Readable).destroy();

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