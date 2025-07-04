import { eachLimit, queue, retry } from 'async';
import { createDecipheriv, Decipher, randomBytes } from 'crypto';
import { Readable } from 'stream';
import { Events } from '..';

import { Abortable, ActionState, Shard } from '../../../api';

import { getStream } from '../../../services/request';
import { HashStream, ProgressNotifier, Events as ProgressEvents } from '../../utils/streams';
import { wrap } from '../../utils/error';
import { logger } from '../../utils/logger';
import { DownloadStrategy, DownloadParams } from './strategy';
import { DownloadOptions } from '.';

export interface DownloadOneStreamStrategyParams extends DownloadParams {
  concurrency: number;
  useProxy: boolean;
  chunkSize?: number;
}

export type DownloadOneStreamStrategyLabel = 'OneStreamOnly';
export type DownloadOneStreamStrategyObject = { 
  label: DownloadOneStreamStrategyLabel
  params: DownloadOneStreamStrategyParams 
};
export type DownloadOneStreamStrategyFunction = (
  bucketId: string,
  fileId: string,
  opts: DownloadOptions,
  strategyObj: DownloadOneStreamStrategyObject,
) => ActionState;

export class DownloadOneStreamStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];
  private internalBuffer: Buffer[] = [];
  private downloadsProgress: number[] = [];
  private decipher: Decipher;
  private concurrency: number;
  private useProxy: boolean;
  private progressIntervalId: NodeJS.Timeout = setTimeout(() => {});
  private aborted = false;

  constructor(params: DownloadOneStreamStrategyParams) {
    super();

    this.concurrency = params.concurrency;
    this.useProxy = params.useProxy;
    this.decipher = createDecipheriv('aes-256-ctr', randomBytes(32), randomBytes(16));
    this.startProgressInterval();

    logger.debug('Using %s concurrent requests', this.concurrency);

    this.addAbortable(() => this.stopProgressInterval());
    this.addAbortable(() => (this.internalBuffer = []));
  }

  private startProgressInterval() {
    this.progressIntervalId = setInterval(() => {
      const currentProgress =
        this.downloadsProgress.reduce((acumm, progress) => acumm + progress, 0) / this.downloadsProgress.length;
      this.emit(Events.Download.Progress, currentProgress);
    }, 5000);
  }

  private stopProgressInterval() {
    clearInterval(this.progressIntervalId);
  }

  private addAbortable(abort: () => void) {
    this.abortables.push({ abort });
  }

  async download(mirrors: Shard[]): Promise<void> {
    try {
      if (this.fileEncryptionKey.length === 0 || this.iv.length === 0) {
        throw new Error('Required decryption data not found');
      }

      this.downloadsProgress = new Array(mirrors.length).fill(0);
      this.decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);

      this.emit(Events.Download.Start);
      this.emit(Events.Download.Ready, this.decipher);
      this.once(Events.Download.Error, (err) => this.decipher.emit('error', err));

      mirrors.sort((mA, mb) => mA.index - mb.index);

      let lastShardIndexDecrypted = -1;

      const downloadTask = (mirror: Shard, cb: (err: Error | null | undefined) => void) => {
        retry(
          { times: 3, interval: 500 },
          (nextTry) => {
            getDownloadStream(
              mirror,
              (err, shardStream) => {
                logger.debug('Got stream for mirror %s', mirror.index);

                if (err) {
                  return nextTry(err);
                }

                this.handleShard(mirror, shardStream as Readable, (downloadErr) => {
                  logger.debug('Stream handled for mirror %s', mirror.index);

                  if (downloadErr) {
                    return nextTry(downloadErr);
                  }

                  const waitingInterval = setInterval(() => {
                    if (lastShardIndexDecrypted !== mirror.index - 1) {
                      return;
                    }

                    clearInterval(waitingInterval);

                    this.decryptShard(mirror.index, (decryptErr) => {
                      logger.debug('Decrypting shard for mirror %s', mirror.index);

                      if (decryptErr) {
                        return nextTry(decryptErr);
                      }
                      lastShardIndexDecrypted++;
                      nextTry(null);
                    });
                  }, 50);
                });
              },
              this.useProxy,
            );
          },
          (err: Error | null | undefined) => {
            if (err) {
              return cb(err);
            }
            cb(null);
          },
        );
      };

      const downloadQueue = queue(downloadTask, this.concurrency);

      this.addAbortable(() => downloadQueue.kill());

      await eachLimit(mirrors, this.concurrency, (mirror, cb) => {
        if (this.aborted) {
          return cb();
        }
        downloadQueue.push(mirror, (err) => {
          if (err) {
            return cb(err);
          }
          this.internalBuffer[mirror.index] = Buffer.alloc(0);

          const isLastShard = mirror.index === mirrors.length - 1;
          if (isLastShard) {
            this.cleanup();
            this.emit(Events.Download.Progress, 1);
            this.decipher.end();
          }
          cb();
        });
      });
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  private cleanup(): void {
    this.stopProgressInterval();
  }

  private decryptShard(index: number, cb: (err: Error | null | undefined) => void) {
    if (this.decipher.write(this.internalBuffer[index])) {
      return cb(null);
    }

    this.decipher.once('drain', cb);
  }

  private handleShard(shard: Shard, stream: Readable, cb: (err: Error | null | undefined) => void) {
    let errored = false;

    const shardBuffers: Buffer[] = [];
    const progressNotifier = new ProgressNotifier(shard.size, 2000);
    const hasher = new HashStream();
    const downloadPipeline = stream.pipe(progressNotifier).pipe(hasher);

    progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
      this.downloadsProgress[shard.index] = progress;
    });

    downloadPipeline.on('data', shardBuffers.push.bind(shardBuffers));
    downloadPipeline
      .once('error', (err) => {
        errored = true;
        cb(err);
      })
      .once('end', () => {
        if (errored) {
          return;
        }

        const hash = hasher.getHash().toString('hex');

        if (hash !== shard.hash) {
          return cb(new Error(`Hash for downloaded shard ${shard.hash} does not match`));
        }

        this.internalBuffer[shard.index] = Buffer.concat(shardBuffers);
        cb(null);
      });
  }

  private handleError(err: Error) {
    this.abortables.forEach((abortable) => abortable.abort());

    this.decipher.emit('error', wrap('OneStreamStrategy', err));
  }

  abort(): void {
    this.aborted = true;
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(Events.Download.Abort);
  }
}

function getDownloadStream(
  shard: Shard,
  cb: (err: Error | null | undefined, stream: Readable | null) => void,
  useProxy = false,
): void {
  getStream(shard.url, { useProxy })
    .then((stream) => {
      cb(null, stream);
    })
    .catch((err) => {
      cb(err, null);
    });
}
