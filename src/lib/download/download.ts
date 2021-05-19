import { DecryptionProgressCallback, DownloadFileOptions, DownloadProgressCallback, EnvironmentConfig } from '../..';
import { FileObject } from '../../api/FileObject';
import { Readable, Transform } from 'stream';
import { FILEMUXER, DOWNLOAD, DECRYPT, FILEOBJECT } from '../events';

// import toStream from 'buffer-to-stream';
import { reconstruct } from 'rs-wrapper';
import { logger } from '../utils/logger';
import { bufferToStream } from '../utils/buffer';


export async function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Readable> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required');
  }

  const File = new FileObject(config, bucketId, fileId);

  logger.info('Retrieving file info...');
  await File.GetFileInfo();

  logger.info('Retrieving mirrors...');
  await File.GetFileMirrors();

  const shards = File.rawShards.filter(s => !s.parity).length;
  const shardSize = File.rawShards[0].size;

  console.log('shardSize', shardSize);

  const parities = File.rawShards.length - shards;
  logger.info('Found %s shards and %s parities', shards, parities);

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
  logger.info('File size is %s bytes', totalSize);

  out.on('error', (err) => { throw err; });

  attachFileObjectListeners(File, out);
  handleFileResolving(File, options.progressCallback, options.decryptionProgressCallback);

  let fileContent: Buffer;

  logger.info('Starting file download');
  const fileEncryptedStream = File.StartDownloadFile();

  fileEncryptedStream.on('data', (chunk: Buffer) => {
    fileContent = Buffer.concat([ fileContent, chunk ])
  });


  return new Promise((resolve, reject) => {
    fileEncryptedStream.on('error', reject);

    fileEncryptedStream.on('end', async () => {
      logger.info('File download finished. File encrypted length is %s bytes', fileContent.length);

      // TODO: Rellenar contenido de los shards corruptos, marcar shards corruptos y su indice, recoger de File
      let rs = File.fileInfo && File.fileInfo.erasure && File.fileInfo?.erasure.type === 'reedsolomon';
      let passThrough = null;

      let shardsStatus = File.rawShards.map(shard => shard.healthy!);
      shardsStatus = shardsStatus && shardsStatus.length > 0 ? shardsStatus : [false];

      // =========== CORRUPT INTENTIONALLY
      shardsStatus[0] = false;
      fileContent = Buffer.concat([Buffer.alloc(shardSize).fill(0), fileContent.slice(shardSize)])
      // ===========

      console.log('shardsStatus', shardsStatus);
      console.log('rs', rs);

      let someShardCorrupt = shardsStatus.some((shardStatus: boolean) => !shardStatus);

      if (someShardCorrupt) {
        if (rs) {
          logger.info('Some shard is corrupy and rs is available. Recovering');

          const fileContentRecovered = await reconstruct(fileContent, shards, parities, shardsStatus);

          console.log(fileContentRecovered instanceof Uint8Array, fileContentRecovered instanceof Buffer);

          passThrough = bufferToStream(Buffer.from(fileContentRecovered.slice(0, totalSize)));

          return resolve(passThrough.pipe(File.decipher).pipe(out));
        } else {
          reject(new Error('File missing shard error'));
        }
      } else {
        logger.info('Reed solomon not required for this file');
      }

      return resolve(bufferToStream(fileContent).pipe(File.decipher).pipe(out));
    }); 
  });
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