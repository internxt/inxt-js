import * as Winston from 'winston';

import { Readable } from 'stream';

import { DownloadFileOptions, DownloadProgressCallback, EnvironmentConfig } from '../..';
import { DOWNLOAD } from '../events';
import { FileObject } from '../../api/FileObject';
import { ActionState } from '../../api/ActionState';
import { DOWNLOAD_CANCELLED } from '../../api/constants';

export async function download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, debug: Winston.Logger, state: ActionState): Promise<Readable> {
  const file = new FileObject(config, bucketId, fileId, debug);

  if (options.fileEncryptionKey) {
    debug.info('Using file encryption key %s to download', options.fileEncryptionKey.toString('hex'));

    console.log('Using custom file encryption key');

    file.setFileEncryptionKey(options.fileEncryptionKey);
  }

  if (options.fileToken) {
    debug.info('Using file token %s to download', options.fileToken);
    file.setFileToken(options.fileToken);
  }

  state.on(DOWNLOAD_CANCELLED, () => {
    file.emit(DOWNLOAD_CANCELLED);
  });

  await file.getInfo();
  await file.getMirrors();

  handleProgress(file, options.progressCallback);

  return file.download();
}

function handleProgress(fl: FileObject, progressCb: DownloadProgressCallback) {
  let totalBytesDownloaded = 0;
  let progress = 0;
  const totalBytes = fl.rawShards.length > 0 ?
    fl.rawShards.reduce((a, b) => ({ size: a.size + b.size }), { size: 0 }).size :
    0;

  if (totalBytes === 0) {
    throw new Error('Total file size can not be 0');
  }

  function getDownloadProgress() {
    return (totalBytesDownloaded / totalBytes);
  }

  fl.on(DOWNLOAD.PROGRESS, (addedBytes: number) => {
    totalBytesDownloaded += addedBytes;
    progress = getDownloadProgress();
    progressCb(progress, totalBytesDownloaded, totalBytes);
  });
}
