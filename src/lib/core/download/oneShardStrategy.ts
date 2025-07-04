import { createDecipheriv, Decipher, randomBytes } from 'crypto';
import { Events } from '..';

import { Abortable, ActionState, Shard } from '../../../api';

import { getStream } from '../../../services/request';
import { HashStream, ProgressNotifier, Events as ProgressEvents } from '../../utils/streams';
import { wrap } from '../../utils/error';
import { DownloadStrategy, DownloadParams } from './strategy';
import { DownloadOptions } from '.';
import { logger } from '../../utils/logger';

export interface DownloadOneShardStrategyParams extends DownloadParams {
  useProxy: boolean;
  chunkSize?: number;
}

export type DownloadOneShardStrategyLabel = 'OneShardOnly';
export type DownloadOneShardStrategyObject = {
  label: DownloadOneShardStrategyLabel;
  params: DownloadOneShardStrategyParams;
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
  private progressIntervalId: NodeJS.Timeout = setTimeout(() => {});
  private aborted = false;

  constructor(params: DownloadOneShardStrategyParams) {
    super();

    this.useProxy = params.useProxy;
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

      const encryptedFileStream = await getStream(onlyMirror.url, { useProxy: this.useProxy });
      const hasher = new HashStream();
      const progressNotifier = new ProgressNotifier(onlyMirror.size, 2000);

      progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
        this.downloadProgress = progress;
      });

      await new Promise((resolve, reject) => {
        const downloadPipeline = encryptedFileStream
          .pipe(progressNotifier)
          .pipe(hasher)
          .pipe(this.decipher);

        this.addAbortable(() => downloadPipeline.destroy());

        this.emit(Events.Download.Ready, downloadPipeline);

        hasher.once('end', () => {
          this.emit(Events.Download.Progress, this.downloadProgress);
          this.stopProgressInterval();

          const hashCalculatedDownloading = hasher.getHash().toString('hex');
          const hashCalculatedUploading = onlyMirror.hash;

          logger.info('Download/OneShardStrategy/Downloading: File hash encrypted is %s', hashCalculatedDownloading);
          logger.info('Download/OneShardStrategy/StoredHash:  File hash encrypted is %s', hashCalculatedUploading);

          if (hashCalculatedDownloading === hashCalculatedUploading) {
            return resolve(null);
          }

          reject(
            new Error(
              'Hash mismatch: Uploading was ' +
                hashCalculatedUploading +
                ' downloading was ' +
                hashCalculatedDownloading,
            ),
          );
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
