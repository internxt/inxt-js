import archiver from 'archiver';
import { Cipher, createCipheriv, randomBytes } from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { v4 } from 'uuid';

import { Environment } from '..';
import { EnvironmentConfig } from '../api';
import { GenerateFileKey } from '../lib/utils/crypto';
import { HashStream, BytesCounter } from '../lib/utils/streams';
import { logger } from '../lib/utils/logger';
import { UploadOptions } from '../lib/core';
import { EnvService } from './EnvService';

const pipelineAsync = promisify(pipeline);
const archive = archiver('zip', { zlib: { level: 9 } });

function getEnvironment(fileEncryptionKey?: Buffer, index?: Buffer): Environment {
  const envConfig: EnvironmentConfig = {
    bridgePass: EnvService.instance.get('BRIDGE_PASS'),
    bridgeUser: EnvService.instance.get('BRIDGE_USER'),
    encryptionKey: EnvService.instance.get('MNEMONIC'),
    bridgeUrl: EnvService.instance.get('BRIDGE_URL'),
    inject: {},
  };

  if (envConfig.inject && fileEncryptionKey) {
    envConfig.inject.fileEncryptionKey = fileEncryptionKey;
  }

  if (envConfig.inject && index) {
    envConfig.inject.index = index;
  }

  return new Environment(envConfig);
}

function getEncryptedFolderMeta(folderPath: string, cipher: Cipher): Promise<{ hash: string; size: number }> {
  const hasher = new HashStream();
  const counter = new BytesCounter();

  setTimeout(archive.finalize.bind(archive), 100);

  hasher.on('data', () => null);

  return pipelineAsync(archive.directory(folderPath + '/', false), cipher, counter, hasher).then(() => {
    return {
      hash: hasher.getHash().toString('hex'),
      size: counter.count,
    };
  });
}

export async function uploadFolder(path: string) {
  const encryptionKey = EnvService.instance.get('MNEMONIC');
  const bucketId = EnvService.instance.get('BUCKET_ID');
  const index = randomBytes(32);
  const iv = index.slice(0, 16);
  const fileEncryptionKey = await GenerateFileKey(encryptionKey, bucketId, index);

  const network = getEnvironment(fileEncryptionKey, index);

  logger.info('Uploading folder "%s"', path);
  logger.debug(
    'Provided params { bucketId: %s, bridgeApi: %s, bridgeUser: %s, directoryPath: %s }',
    bucketId,
    network.config.bridgeUrl,
    network.config.bridgeUser,
    path,
  );

  const cipher = createCipheriv('aes-256-ctr', fileEncryptionKey, iv);
  const { hash, size } = await getEncryptedFolderMeta(path, cipher);
  const networkFilename = v4();

  const archiverSetup = archiver('zip', { zlib: { level: 9 } });
  const directoryStream = archiverSetup.directory(path + '/', false);
  archiverSetup.finalize();

  logger.debug('directory hash zipped is %s', hash);
  logger.debug('directory ziped size is %s', size);
  logger.info('Network name is %s', networkFilename);

  type ResolveFunction = (res: null) => void;
  type RejectFunction = (err: Error) => void;

  const finishCbGenerator = (resolve: ResolveFunction, reject: RejectFunction) => {
    return (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve(null);
      }
    };
  };

  const uploadOptionsGenerator = (resolve: ResolveFunction, reject: RejectFunction): UploadOptions => ({
    source: directoryStream,
    fileSize: size,
    progressCallback: (progress: number) => {
      logger.debug('Progress %s%', (progress * 100).toFixed(2));
    },
    finishedCallback: finishCbGenerator(resolve, reject),
  });

  await new Promise((resolve, reject) => {
    const state = network.upload(bucketId, uploadOptionsGenerator(resolve, reject));

    process.on('SIGINT', () => network.uploadCancel(state));
  })
    .then((fileId) => {
      logger.info('File upload finished. File id: %s', fileId);

      process.exit(0);
    })
    .catch((err) => {
      logger.error('Error uploading file: %s', err.message);

      process.exit(-1);
    });
}
