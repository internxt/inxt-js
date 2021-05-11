import { DecryptionProgressCallback, DownloadFileOptions, DownloadProgressCallback, EnvironmentConfig } from '../..';
import { FileObject } from '../../api/FileObject';
import { Readable, Transform } from 'stream';
import { FILEMUXER, DOWNLOAD, DECRYPT, FILEOBJECT } from '../events';

export async function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Readable> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required');
  }

  const File = new FileObject(config, bucketId, fileId);
  await File.GetFileInfo();

  // API request file mirrors with tokens
  await File.GetFileMirrors();

  let totalSize = File.final_length;
  const out = new Transform({
    transform(chunk: Buffer, enc, cb) {
      if (chunk.length > totalSize) {
        cb(null, chunk.slice(0, totalSize));
      } else {
        totalSize -= chunk.length;
        cb(null, chunk);
      }
    }
  });

  out.on('error', (err) => { throw err; });

  attachFileObjectListeners(File, out);
  handleFileResolving(File, options.progressCallback, options.decryptionProgressCallback);

  return File.StartDownloadFile().pipe(File.decipher).pipe(out);
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

function handleFileResolving(fl: FileObject, downloadCb: DownloadProgressCallback, decryptionCb?: DecryptionProgressCallback) {
  let totalBytesDownloaded = 0, totalBytesDecrypted = 0;
  let progress = 0;
  const totalBytes = fl.fileInfo ? fl.fileInfo.size : 0;

  function getDownloadProgress() {
    return (totalBytesDownloaded / totalBytes) * 100;
  }

  function getDecryptionProgress() {
    return (totalBytesDecrypted / totalBytes) * 100;
  }

  fl.on(DOWNLOAD.PROGRESS, async (addedBytes: number) => {
    totalBytesDownloaded += addedBytes;
    progress = getDownloadProgress();
    downloadCb(progress, totalBytesDownloaded, totalBytes);
  });

  if (decryptionCb) {
    fl.on(DECRYPT.PROGRESS, (addedBytes: number) => {
      totalBytesDecrypted += addedBytes;
      progress = getDecryptionProgress();
      decryptionCb(progress, totalBytesDecrypted, totalBytes);
    });
  }
}
