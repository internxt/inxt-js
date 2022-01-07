import { retry } from 'async';
import { createDecipheriv, Decipher, randomBytes } from 'crypto';
import { pipeline, Readable, Writable } from 'stream';
import { Events } from '..';

import { Abortable, ActionState, Shard, ShardObject } from '../../../api';

import { getStream } from '../../../services/request';
import { HashStream, ProgressNotifier, Events as ProgressEvents } from '../../utils/streams';
import { wrap } from '../../utils/error';
import { DownloadStrategy, DownloadParams } from './strategy';
import { DownloadOptions } from '.';
import { logger } from '../../utils/logger';

export interface DownloadOneShardStrategyParams extends DownloadParams {
  useProxy: boolean;
  writeTo: Writable
};

export type DownloadOneShardStrategyLabel = 'OneShardOnly';
export type DownloadOneShardStrategyObject = {
  label: DownloadOneShardStrategyLabel
  params: DownloadOneShardStrategyParams
};
export type DownloadOneShardStrategyFunction = (
  bucketId: string,
  fileId: string,
  opts: DownloadOptions,
  strategyObj: DownloadOneShardStrategyObject,
) => ActionState;

export class DownloadOneShardStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];
  private downloadProgress = 0;
  private decipher: Decipher;
  private useProxy: boolean;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private progressIntervalId: NodeJS.Timeout = setTimeout(() => { });
  private aborted = false;

  private destination: Writable;

  constructor(params: DownloadOneShardStrategyParams) {
    super();

    this.useProxy = params.useProxy;
    this.destination = params.writeTo;
    this.decipher = createDecipheriv('aes-256-ctr', randomBytes(32), randomBytes(16));
    this.startProgressInterval();

    this.addAbortable(() => this.stopProgressInterval());
  }

  private startProgressInterval() {
    this.progressIntervalId = setInterval(() => {
      this.emit(Events.Download.Progress, this.downloadProgress);
    }, 5000);
  }

  private stopProgressInterval() {
    clearInterval(this.progressIntervalId);
  }

  private addAbortable(abort: () => void) {
    if (this.aborted) {
      return abort();
    }
    this.abortables.push({ abort });
  }

  async download(mirrors: Shard[]): Promise<void> {
    if (mirrors.length !== 1) {
      throw new Error('This strategy only supports files with one shard');
    }

    const [onlyMirror] = mirrors;

    try {
      if (this.fileEncryptionKey.length === 0 || this.iv.length === 0) {
        throw new Error('Required decryption data not found');
      }

      this.decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);

      this.emit(Events.Download.Start);
      this.emit(Events.Download.Ready, this.decipher);
      this.once(Events.Download.Error, (err) => this.decipher.emit('error', err));

      await retry({ times: 3, interval: 500 }, (nextTry) => {
        getDownloadStream(onlyMirror, this.useProxy).then((encryptedFileStream) => {
          const hasher = new HashStream();
          const progressNotifier = new ProgressNotifier(onlyMirror.size, 2000);

          const downloadPipeline = pipeline(encryptedFileStream, progressNotifier, hasher, (err) => {
            console.log(err);
          });

          this.decipher.once('end', () => {
            const hashCalculatedDownloading = hasher.getHash().toString('hex');
            const hashCalculatedUploading = onlyMirror.hash;

            logger.info(
              'Download/OneShardStrategy/Downloading: File hash encrypted is %s',
              hashCalculatedDownloading
            );

            logger.info(
              'Download/OneShardStrategy/StoredHash: File hash encrypted is %s',
              hashCalculatedUploading
            );

            if (hashCalculatedDownloading === hashCalculatedUploading) {
              return nextTry();
            }

            nextTry(new Error(
              'Hash mismatch: Uploading was ' +
              hashCalculatedUploading +
              ' downloading was ' +
              hashCalculatedDownloading
            ));
          });

          downloadPipeline.once('end', () => {
            this.decipher.end();
          });

          downloadPipeline.on('data', (chunk) => {
            const canReceiveMore = this.decipher.write(chunk);

            if (!canReceiveMore) {
              downloadPipeline.pause();
              this.decipher.once('drain', () => {
                downloadPipeline.resume();
              });
            }
          });
        }).catch((err) => {
          nextTry(err);
        });
      });
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  private cleanup(): void {
    this.stopProgressInterval();
  }

  private handleError(err: Error) {
    this.cleanup();
    this.abortables.forEach((abortable) => abortable.abort());

    this.decipher.emit('error', wrap('OneStreamStrategy', err));
  }

  abort(): void {
    this.aborted = true;
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(Events.Download.Abort);
  }
}

function getDownloadStream(shard: Shard, useProxy = false): Promise<Readable> {
  return ShardObject.requestGet(buildRequestUrlShard(shard), useProxy)
    .then((url) => getStream(url, { useProxy }));
}

function buildRequestUrlShard(shard: Shard) {
  const { address, port } = shard.farmer;

  return `http://${address}:${port}/download/link/${shard.hash}`;
}
