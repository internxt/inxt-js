import * as Winston from 'winston';

import { Readable, Transform } from 'stream';

import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { FILEMUXER, DOWNLOAD, DECRYPT, FILEOBJECT } from '../events';
import { FileObject } from '../../api/FileObject';
import { ActionState } from '../../api/ActionState';
import { DOWNLOAD_CANCELLED, DOWNLOAD_CANCELLED_ERROR } from '../../api/constants';

export async function download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, debug: Winston.Logger, state: ActionState): Promise<Readable> {
  const file = new FileObject(config, bucketId, fileId, debug);

  handleStateChanges(file, state, options);

  await file.getInfo();
  await file.getMirrors();

  handleProgress(file, options);

  return file.download();
}

// TODO: use propagate lib
function attachFileObjectListeners(f: FileObject, notified: Transform) {
  // propagate events to notified
  f.on(FILEMUXER.PROGRESS, (msg) => notified.emit(FILEMUXER.PROGRESS, msg));

  // TODO: Handle filemuxer errors
  f.on(FILEMUXER.ERROR, (err) => notified.emit(FILEMUXER.ERROR, err));

  // TODO: Handle fileObject errors
  f.on('error', (err) => notified.emit(FILEOBJECT.ERROR, err));
  // f.on('end', () => notified.emit(FILEOBJECT.END))

  // f.decipher.on('end', () => notified.emit(DECRYPT.END))
  f.decipher.once('error', (err: Error) => notified.emit(DECRYPT.ERROR, err));
}

function handleProgress(fl: FileObject, options: DownloadFileOptions) {
  let totalBytesDownloaded = 0;
  let totalBytesDecrypted = 0;
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

  function getDecryptionProgress() {
    return (totalBytesDecrypted / totalBytes);
  }

  fl.on(DOWNLOAD.PROGRESS, (addedBytes: number) => {
    totalBytesDownloaded += addedBytes;
    progress = getDownloadProgress();
    options.progressCallback(progress, totalBytesDownloaded, totalBytes);
  });

  const decryptionProgress = options.decryptionProgressCallback ?? (() => null);

  fl.on(DECRYPT.PROGRESS, (addedBytes: number) => {
    totalBytesDecrypted += addedBytes;
    progress = getDecryptionProgress();
    decryptionProgress(progress, totalBytesDecrypted, totalBytes);
  });
}

function handleStateChanges(file: FileObject, state: ActionState, options: DownloadFileOptions) {
  state.on(DOWNLOAD_CANCELLED, () => {
    file.emit(DOWNLOAD_CANCELLED);

    options.finishedCallback(Error(DOWNLOAD_CANCELLED_ERROR), null);

    // prevent more calls to any callback
    options.progressCallback = () => { };
    options.finishedCallback = () => { };
  });
}
