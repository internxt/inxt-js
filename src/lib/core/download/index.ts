import { Readable } from 'stream';
import { Events } from '..';

import { ActionState, EnvironmentConfig, FileObject } from '../../../api';
import { logger } from '../../utils/logger';
import { DownloadStrategy } from './strategy';

export * from './strategy';
export * from './oneStreamStrategy';
export type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;

export type OneStreamStrategyLabel = 'OneStreamOnly';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OneStreamStrategyObject = { label: OneStreamStrategyLabel, params: any};
export type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadFileOptions, strategyObj: OneStreamStrategyObject) => ActionState;

export type MultipleStreamsStrategyLabel = 'MultipleStreams';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MultipleStreamsStrategyObject = { label: MultipleStreamsStrategyLabel, params: any};
export type MultipleStreamsStrategyFunction = (bucketId: string, fileId: string, opts: DownloadFileOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;

export type DownloadStrategyLabel = OneStreamStrategyLabel;
export type DownloadStrategyObject = OneStreamStrategyObject | MultipleStreamsStrategyObject;
export type DownloadFunction = OneStreamStrategyFunction & MultipleStreamsStrategyFunction;

export interface DownloadFileOptions {
  fileToken?: string;
  fileEncryptionKey?: Buffer;
  progressCallback: DownloadProgressCallback;
  finishedCallback: DownloadFinishedCallback;
}

export async function download(
  config: EnvironmentConfig, 
  bucketId: string, 
  fileId: string, 
  options: DownloadFileOptions, 
  state: ActionState, 
  strategy: DownloadStrategy
): Promise<Readable> {
  const file = new FileObject(config, bucketId, fileId, strategy);

  if (options.fileEncryptionKey) {
    file.setFileEncryptionKey(options.fileEncryptionKey);
  }

  if (options.fileToken) {
    logger.info('Using file token %s to download', options.fileToken);
    file.setFileToken(options.fileToken);
  }

  state.once(Events.Download.Abort, () => {
    file.emit(Events.Download.Abort);
  });

  file.on(Events.Download.Progress, (progress) => {
    options.progressCallback(progress, 0, 0)
  });

  return file.getInfo()
    .then(() => file.getMirrors())
    .then(() => file.download());
}
