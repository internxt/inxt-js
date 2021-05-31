import { Readable, Transform } from 'stream';
import { reconstruct } from 'rs-wrapper';

import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { FileObject } from '../../api/FileObject';
import { FILEMUXER, DOWNLOAD, DECRYPT, FILEOBJECT } from '../events';
import { logger } from '../utils/logger';
import { bufferToStream } from '../utils/buffer';
import { promisifyStream } from '../utils/promisify';

export async function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Readable> {
  if (!config.encryptionKey) { throw Error('Encryption key required'); }
  if (!bucketId) { throw Error('Bucket id required'); }
  if (!fileId) { throw Error('File id required'); }

  const File = new FileObject(config, bucketId, fileId);

  await File.GetFileInfo();
  await File.GetFileMirrors();

  handleProgress(File, options);

  const fileStream = await File.download();

  const fileChunks: Buffer[] = [];
  const shards = File.rawShards.filter(shard => !shard.parity).length;
  const parities = File.rawShards.length - shards;

  fileStream.on('data', (chunk: Buffer) => { fileChunks.push(chunk); });
  await promisifyStream(fileStream);

  let fileContent = Buffer.concat(fileChunks);
  const rs = File.fileInfo && File.fileInfo.erasure && File.fileInfo.erasure.type === 'reedsolomon';
  const shardsStatus = File.rawShards.map(shard => shard.healthy!);
  const corruptShards = shardsStatus.filter(status => !status).length;
  const fileSize = File.final_length;

  if (corruptShards > 0) {
    if (rs) {
      logger.info('Some shard(s) is/are corrupt and rs is available. Recovering');

      fileContent = Buffer.from(await reconstruct(fileContent, shards, parities, shardsStatus)).slice(0, fileSize);

      return bufferToStream(fileContent).pipe(File.decipher);
    }

    throw new Error(corruptShards + ' file shard(s) is/are corrupt');
  } else {
    return bufferToStream(fileContent.slice(0, fileSize)).pipe(File.decipher);
  }
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
  let totalBytesDownloaded = 0, totalBytesDecrypted = 0;
  let progress = 0;
  const totalBytes = fl.rawShards.length > 0 ?
    fl.rawShards.reduce((a, b) => ({ size: a.size + b.size }), { size: 0 }).size :
    0;

  function getDownloadProgress() {
    return (totalBytesDownloaded / totalBytes) * 100;
  }

  function getDecryptionProgress() {
    return (totalBytesDecrypted / totalBytes) * 100;
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
