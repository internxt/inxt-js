import { ErrorCallback, queue, QueueObject, retry } from "async";
import { createDecipheriv, Decipher, randomBytes } from "crypto";
import { pipeline, Readable } from "stream";
import { EnvironmentConfig } from "../..";

import { Abortable } from "../../api/Abortable";
import { Events } from "../../api/events";
import { ExchangeReport } from "../../api/reports";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
import { HashStream } from "../hasher";
import { ProgressNotifier, Events as ProgressEvents } from "../streams";
import { determineConcurrency } from "../utils";
import { wrap } from "../utils/error";
import { DownloadStrategy } from "./DownloadStrategy";

function getDownloadStream(shard: Shard, cb: (err: Error | null, stream: Readable | null) => void): void {
  ShardObject.requestGet(buildRequestUrlShard(shard)).then(getStream).then((stream) => {
    cb(null, stream);
  }).catch((err) => {
    console.log('err', err);
    cb(err, null);
  });
}

function buildRequestUrlShard(shard: Shard) {
  const { address, port } = shard.farmer;

  return `http://${address}:${port}/download/link/${shard.hash}`;
}


export class MultipleStreamsStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];
  private decryptBuffer: { index: number, content: Buffer }[] = [];
  private currentShardIndex = 0;
  private mirrors: Shard[] = [];
  private downloadsProgress: number[] = [];
  private decipher: Decipher;
  private config: EnvironmentConfig;
  private aborted = false;

  private progressIntervalId: NodeJS.Timeout = setTimeout(() => {}); 

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

  private buildDownloadQueue(fileSize: number, concurrency = 1): QueueObject<Shard> {
    let alreadyErrored = false;

    return queue((mirror: Shard, next: ErrorCallback<Error>) => {
      retry({ times: 3, interval: 500 }, (nextTry) => {
        const report = buildReport(this.config, mirror);

        getDownloadStream(mirror, (err, downloadStream) => {
          if (this.aborted || alreadyErrored) {
            return nextTry(null);
          }
          
          if (err) {
            console.log('error getting download stream for mirror %s', mirror.index);
            console.log(err);

            reportError(report);
            return nextTry(err);
          }

          this.addAbortable(() => downloadStream?.emit('signal', 'Destroy request'));
  
          const progressNotifier = new ProgressNotifier(fileSize, 2000);
          const hasher = new HashStream();
  
          progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
            this.downloadsProgress[mirror.index] = progress;
          });
  
          bufferToStream((downloadStream as Readable).pipe(progressNotifier).pipe(hasher), (toBufferErr, res) => {
            if (this.aborted || alreadyErrored) {
              return nextTry(null);
            }
  
            if (toBufferErr) {
              console.log('error getting buffer to stream for mirror %s', mirror.index);
              console.log(err);

              reportError(report);
              return nextTry(toBufferErr);
            }

            const hash = hasher.getHash().toString('hex');

            if (hash !== mirror.hash) {
              reportError(report);
              return nextTry(new Error(`Hash for shard ${mirror.hash} do not match`));
            }

            reportOk(report);

            this.decryptBuffer.push({ index: mirror.index, content: res as Buffer });

            nextTry(null);
          });
        });
      }, (err: Error | null | undefined) => {
        if (err) {
          alreadyErrored = true;
          return next(err);
        } 

        next();
      });
    }, concurrency);
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

      console.log('there are %s mirrors for this file', mirrors.length);
      console.log('concurrency', concurrency);

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

    // console.log('shard ready??', shardReady);

    if (!shardReady) {
      return;
    }

    // console.log('currentshardIndex is %s', this.currentShardIndex);

    let shardsAvailable = true;
    let isLastShard = false;

    while (shardsAvailable) {
      downloadedShardIndex = this.decryptBuffer.findIndex(pendingDecrypt => pendingDecrypt.index === this.currentShardIndex);
      // console.log('download found?', downloadedShardIndex !== -1);

      if (downloadedShardIndex !== -1) {
        isLastShard = this.currentShardIndex === this.mirrors.length - 1;

        // console.log('is last shard', isLastShard);

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

function buildReport(config: EnvironmentConfig, mirror: Shard) {
  const report = new ExchangeReport(config);

  report.params.exchangeStart = new Date();
  report.params.farmerId = mirror.farmer.nodeID;
  report.params.dataHash = mirror.hash;

  return report;
}

function reportError(report: ExchangeReport) {
  report.DownloadError();
  report.sendReport().catch(() => {});
}

function reportOk(report: ExchangeReport) {
  report.DownloadOk();
  report.sendReport().catch(() => {});
}
