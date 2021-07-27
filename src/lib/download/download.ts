import * as Winston from 'winston';

import { Readable } from 'stream';

import { DownloadProgressCallback, EnvironmentConfig } from '../..';
import { DOWNLOAD } from '../events';
import { FileObject } from '../../api/FileObject';
import { ActionState } from '../../api/ActionState';
import { DOWNLOAD_CANCELLED } from '../../api/constants';

export async function download(config: EnvironmentConfig, bucketId: string, fileId: string, progress: DownloadProgressCallback, debug: Winston.Logger, state: ActionState): Promise<Readable> {
  const file = new FileObject(config, bucketId, fileId, debug);

  state.on(DOWNLOAD_CANCELLED, () => {
    file.emit(DOWNLOAD_CANCELLED);
  });

  await file.getInfo();
  await file.getMirrors();

  handleProgress(file, progress);

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
