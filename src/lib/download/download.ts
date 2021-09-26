import * as Winston from 'winston';

import { Readable } from 'stream';

import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { ActionState } from '../../api/ActionState';
import { FileObject } from '../../api/FileObject';
import { DownloadEvents, DownloadStrategy } from './DownloadStrategy';
import { Events } from '../../api/events';

export async function download(
  config: EnvironmentConfig, 
  bucketId: string, 
  fileId: string, 
  options: DownloadFileOptions, 
  debug: Winston.Logger, 
  state: ActionState, 
  strategy: DownloadStrategy
): Promise<Readable> {
  const file = new FileObject(config, bucketId, fileId, debug, strategy);

  state.once(Events.Download.Abort, () => file.emit(Events.Download.Abort));

  file.on(DownloadEvents.Progress, (progress) => options.progressCallback(progress, 0, 0));

  // TODO: Allow this to be injected in FileObject
  if (options.fileEncryptionKey) {
    file.setFileEncryptionKey(options.fileEncryptionKey);
  }
  if (options.fileToken) {
    debug.info('Using file token %s to download', options.fileToken);
    file.setFileToken(options.fileToken);
  }

  return file.getInfo().then(() => file.getMirrors()).then(() => file.download());
}
