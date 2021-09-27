import { ErrorCallback, queue, QueueObject, retry } from "async";
import { createDecipheriv, Decipher, randomBytes } from "crypto";
import EventEmitter from "events";
import { Readable } from "stream";
import { EnvironmentConfig } from "../..";

import { Abortable } from "../../api/Abortable";
import { Events } from "../../api/events";
import { ExchangeReport } from "../../api/reports";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { HashStream } from "../hasher";
import { ProgressNotifier, Events as ProgressEvents } from "../streams";
import { determineConcurrency } from "../utils";
import { wrap } from "../utils/error";
import { DownloadStrategy } from "./DownloadStrategy";

export class MultipleStreamsStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];
  private decryptBuffer: { index: number, content: Buffer }[] = [];
  private currentShardIndex = 0;
  private mirrors: Shard[] = [];
  private downloadsProgress: number[] = [];
  private decipher: Decipher;
  private config: EnvironmentConfig;
  private aborted = false;

  private progressIntervalId: NodeJS.Timeout = setTimeout(() => { });

  private queues: {
    downloadQueue: QueueObject<Shard>,
    decryptQueue: QueueObject<Buffer>
  } = {
      downloadQueue: queue(() => { }),
      decryptQueue: queue(() => { })
    };

  private progressCoefficients = {
    download: 0.95,
    decrypt: 0.05
  }

  constructor(config: EnvironmentConfig) {
    super();

    this.config = config;

    if ((this.progressCoefficients.download + this.progressCoefficients.decrypt) !== 1) {
      throw new Error('Progress coefficients are wrong');
    }

    this.startProgressInterval();

    this.addAbortable(() => this.stopProgressInterval());
    this.addAbortable(() => this.decryptBuffer = []);

    this.decipher = createDecipheriv('aes-256-ctr', randomBytes(32), randomBytes(16));
  }

  private startProgressInterval() {
    this.progressIntervalId = setInterval(() => {
      const currentProgress = this.downloadsProgress.reduce((acumm, progress) => acumm + progress, 0);
      this.emit(Events.Download.Progress, currentProgress * this.progressCoefficients.download);
    }, 5000);
  }

  private stopProgressInterval() {
    clearInterval(this.progressIntervalId);
  }

  private addAbortable(abort: () => any) {
    this.abortables.push({ abort });
  }

  private buildDownloadTask(fileSize: number, abortSignal: EventEmitter) {
    let shouldStop = false;

    abortSignal.once('abort', () => {
      shouldStop = true;
    });

    return (mirror: Shard, cb: (err: Error | null | undefined) => void) => {
      const report = ExchangeReport.build(this.config, mirror);

      ShardObject.getDownloadStream(mirror, (err, downloadStream) => {
        if (shouldStop) {
          return cb(null);
        }

        if (err) {
          report.error();
          return cb(err);
        }

        this.addAbortable(() => downloadStream?.emit('signal', 'Destroy request'));

        const progressNotifier = new ProgressNotifier(fileSize, 2000);
        const hasher = new HashStream();

        progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
          this.downloadsProgress[mirror.index] = progress;
        });

        const downloadPipeline = (downloadStream as Readable).pipe(progressNotifier).pipe(hasher);

        bufferToStream(downloadPipeline, (toBufferErr, res) => {
          if (shouldStop) {
            return cb(null);
          }

          if (toBufferErr) {
            report.error();
            return cb(toBufferErr);
          }

          const hash = hasher.getHash().toString('hex');

          if (hash !== mirror.hash) {
            report.error();
            return cb(new Error(`Hash for shard ${mirror.hash} do not match`));
          }

          report.success();

          this.decryptBuffer.push({ index: mirror.index, content: res as Buffer });

          cb(null);
        });
      });
    }
  }

  private buildDownloadQueue(fileSize: number, concurrency = 1): QueueObject<Shard> {
    const task = (mirror: Shard, next: ErrorCallback<Error>) => {
      retry({ times: 3, interval: 500 }, (nextTry) => {
        this.buildDownloadTask(fileSize, new EventEmitter())(mirror, nextTry)
      }).then(() => {
        next();
      }).catch((err) => {
        next(err);
      });
    }

    return queue(task, concurrency);
  }

  async download(mirrors: Shard[]): Promise<void> {
    try {
      if (this.fileEncryptionKey.length === 0 || this.iv.length === 0) {
        throw new Error('Required decryption data not found');
      }

      this.decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      this.emit(Events.Download.Ready, this.decipher);

      // As we emit the decipher asap, the decipher should be used as the error channel
      this.once(Events.Download.Error, (err) => this.decipher.emit('error', err));

      this.mirrors = mirrors;
      this.mirrors.sort((mA, mB) => mA.index - mB.index);

      this.downloadsProgress = new Array(mirrors.length).fill(0);

      const fileSize = this.mirrors.reduce((acumm, mirror) => mirror.size + acumm, 0);
      const concurrency = determineConcurrency(200 * 1024 * 1024, fileSize)

      this.queues.decryptQueue = buildDecryptQueue(this.decipher);
      this.queues.downloadQueue = this.buildDownloadQueue(fileSize, concurrency);

      this.addAbortable(() => this.queues.downloadQueue.kill());
      this.addAbortable(() => this.queues.decryptQueue.kill());

      this.queues.downloadQueue.push(mirrors, (err) => {
        if (this.aborted) {
          return;
        }
        if (err) {
          return this.handleError(err);
        }
        this.checkShardsPendingToDecrypt(this.decipher);
      });
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  handleError(err: Error) {
    this.abortables.forEach((abortable) => abortable.abort());

    this.decipher.emit('error', wrap('MultipleStreamsStreategy', err));
  }

  checkShardsPendingToDecrypt(decipher: Decipher) {
    let downloadedShardIndex = this.decryptBuffer.findIndex(pendingDecrypt => pendingDecrypt.index === this.currentShardIndex);
    const shardReady = downloadedShardIndex !== -1;

    if (!shardReady) {
      return;
    }

    let shardsAvailable = true;
    let isLastShard = false;

    while (shardsAvailable) {
      downloadedShardIndex = this.decryptBuffer.findIndex(pendingDecrypt => pendingDecrypt.index === this.currentShardIndex);

      if (downloadedShardIndex !== -1) {
        isLastShard = this.currentShardIndex === this.mirrors.length - 1;

        this.queues.decryptQueue.push(this.decryptBuffer[downloadedShardIndex].content, isLastShard ? () => {
          this.stopProgressInterval();
          decipher.end();
        } : () => null);
        this.decryptBuffer[downloadedShardIndex].content = Buffer.alloc(0);

        this.currentShardIndex++;
      } else {
        shardsAvailable = false;
      }
    }
  }

  abort(): void {
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(Events.Download.Abort);
  }
}

function buildDecryptQueue(decipher: Decipher): QueueObject<Buffer> {
  return queue((encryptedShard: Buffer, cb: ErrorCallback<Error>) => {
    if (decipher.write(encryptedShard)) {
      return cb();
    }
    decipher.once('drain', cb);
  }, 1);
}

function bufferToStream(r: Readable, cb: (err: Error | null, res: Buffer | null) => void): void {
  const buffers: Buffer[] = [];

  r.on('data', buffers.push.bind(buffers));
  r.once('error', (err) => cb(err, null));
  r.once('end', () => cb(null, Buffer.concat(buffers)));
}
