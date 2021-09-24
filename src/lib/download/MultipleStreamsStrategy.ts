import { ErrorCallback, queue, QueueObject } from "async";
import { createDecipheriv, Decipher, randomBytes } from "crypto";
import { Readable } from "stream";
import { EnvironmentConfig } from "../..";

import { Abortable } from "../../api/Abortable";
import { Events } from "../../api/events";
import { ExchangeReport } from "../../api/reports";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
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

  private progressIntervalId: NodeJS.Timeout; 

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

    this.progressIntervalId = setInterval(() => {
      const currentProgress = this.downloadsProgress.reduce((acumm, progress) => acumm + progress, 0);
      this.emit(Events.Download.Progress, currentProgress * this.progressCoefficients.download);
    }, 5000);

    this.abortables.push({ abort: () => clearInterval(this.progressIntervalId) });
    this.abortables.push({ abort: () => this.decryptBuffer = [] });

    this.decipher = createDecipheriv('aes-256-ctr', randomBytes(32), randomBytes(16));
  }

  private buildDownloadQueue(fileSize: number, concurrency = 1): QueueObject<Shard> {
    let alreadyErrored = false;

    return queue((mirror: Shard, next: ErrorCallback<Error>) => {
      // console.log('processing shard for mirror %s', mirror.index);
      // console.log('aqui llego');
      getDownloadStream(mirror, (err, downloadStream) => {
        console.log('downloadStream Err', err);
        const exchangeReport = new ExchangeReport(this.config);
        // console.log('i got the download stream for mirror %s', mirror.index);

        this.abortables.push({ 
          abort: () => {
            downloadStream?.emit('signal', 'Destroy request')
          } 
        });

        if (alreadyErrored || this.aborted) {
          return next();
        }
        
        if (err) {
          console.log('error getting download stream for mirror %s', mirror.index);
          console.log(err);
          exchangeReport.DownloadError();
          exchangeReport.sendReport().catch(() => {});
          alreadyErrored = true;
          return next(err);
        }

        const progressNotifier = new ProgressNotifier(fileSize, 2000);

        progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
          this.downloadsProgress[mirror.index] = progress;
        });

        bufferToStream((downloadStream as Readable).pipe(progressNotifier), (toBufferErr, res) => {
          // console.log('i got the buffer for mirror %s', mirror.index);
          if (alreadyErrored || this.aborted) {
            return next();
          }

          if (toBufferErr) {
            exchangeReport.DownloadError();
            exchangeReport.sendReport().catch(() => {});
            console.log('error getting buffer to stream for mirror %s', mirror.index);
            console.log(err);
            alreadyErrored = true;
            return next(toBufferErr);
          }

          exchangeReport.DownloadOk();
          exchangeReport.sendReport().catch(() => {});
          this.decryptBuffer.push({ index: mirror.index, content: res as Buffer });

          next();
        });
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

      this.abortables.push({ abort: () => this.queues.downloadQueue.kill() });
      this.abortables.push({ abort: () => this.queues.decryptQueue.kill() });

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
          clearInterval(this.progressIntervalId);
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