import { Readable } from 'stream';
import { Events } from '..';

import { ActionState, EnvironmentConfig, FileObject } from '../../../api';
import { logger } from '../../utils/logger';
import { DownloadStrategy } from './strategy';

export * from './strategy';
export * from './oneStreamStrategy';
export * from './oneShardStrategy';
export * from './dynamicStrategy';

export type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export type DownloadProgressCallback = (
  progress: number,
  downloadedBytes: number | null,
  totalBytes: number | null,
) => void;

export interface DownloadOptions {
  /**
   * Token used for retrieving a shared file with you
   */
  fileToken?: string;
  /**
   * Custom file encryption key injected (p.e: for shared files)
   */
  fileEncryptionKey?: Buffer;
  progressCallback: DownloadProgressCallback;
  finishedCallback: DownloadFinishedCallback;
}

/**
 * Download entry point
 * @param config Environment config
 * @param bucketId id of the bucket that has the file
 * @param fileId id of the file to be downloaded
 * @param params
 * @param state
 * @param strategy strategy used to download the file
 * @returns
 */
export async function download(
  config: EnvironmentConfig,
  bucketId: string,
  fileId: string,
  params: DownloadOptions,
  state: ActionState,
  downloader: DownloadStrategy,
): Promise<Readable> {
  const file = new FileObject(config, bucketId, fileId, downloader);

  if (params.fileEncryptionKey) {
    file.setFileEncryptionKey(params.fileEncryptionKey);
  }

  if (params.fileToken) {
    logger.info('Using file token %s to download', params.fileToken);
    file.setFileToken(params.fileToken);
  }

  state.once(Events.Download.Abort, () => {
    file.emit(Events.Download.Abort);
  });

  file.on(Events.Download.Progress, (progress) => {
    params.progressCallback(progress, 0, 0);
  });

  return file
    .getInfo()
    .then(() => file.getMirrors())
    .then(() => file.download());
}
