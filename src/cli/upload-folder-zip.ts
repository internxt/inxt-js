import archiver from 'archiver';
import { Cipher, createCipheriv, randomBytes } from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { Environment, EnvironmentConfig } from '..';
import { GenerateFileKey } from '../lib/crypto';
import { HashStream } from '../lib/hasher';
import { BytesCounter } from '../lib/streams';
import { OneStreamStrategyObject } from '../lib/upload';
import { logger } from '../lib/utils/logger';

const pipelineAsync = promisify(pipeline);
const archive = archiver('zip', { zlib: { level: 9 } });

function getEnvironment(fileEncryptionKey?: Buffer, index?: Buffer): Environment {
  const envConfig: EnvironmentConfig = {
    bridgePass: process.env.BRIDGE_PASS,
    bridgeUser: process.env.BRIDGE_USER,
    encryptionKey: process.env.MNEMONIC,
    bridgeUrl: process.env.BRIDGE_URL,
    inject: {}
  };

  if (envConfig.inject && fileEncryptionKey) {
    envConfig.inject.fileEncryptionKey = fileEncryptionKey;
  }

  if (envConfig.inject && index) {
    envConfig.inject.index = index;
  }

  return new Environment(envConfig);
}

function getEncryptedFolderMeta(folderPath: string, cipher: Cipher): Promise<{ hash: string, size: number }> {
  const hasher = new HashStream();
  const counter = new BytesCounter();

  setTimeout(archive.finalize.bind(archive), 100);

  hasher.on('data', () => {});

  return pipelineAsync(archive.directory(folderPath + '/', false), cipher, counter, hasher)
    .then(() => {
      return {
        hash: hasher.getHash().toString('hex'),
        size: counter.count
      };
    })
}

export async function uploadFolder(path: string) {
  const encryptionKey = process.env.MNEMONIC;
  const bucketId = process.env.BUCKET_ID;
  const index = randomBytes(32);
  const iv = index.slice(0, 16);
  const fileEncryptionKey = await GenerateFileKey(encryptionKey, bucketId, index);

  const network = getEnvironment(fileEncryptionKey, index);

  logger.info('Uploading folder "%s"', path);
  logger.debug('Provided params { bucketId: %s, bridgeApi: %s, bridgeUser: %s, directoryPath: %s }',
    process.env.BUCKET_ID,
    network.config.bridgeUrl,
    network.config.bridgeUser,
    path
  );

  const cipher = createCipheriv('aes-256-ctr', fileEncryptionKey, iv);
  const folderMeta = await getEncryptedFolderMeta(path, cipher);

  const archiverSetup = archiver('zip', { zlib: { level: 9 } })
  const directoryStream = archiverSetup.directory(path + '/', false);
  archiverSetup.finalize();

  logger.debug('directory hash zipped is %s', folderMeta.hash);
  logger.debug('directory ziped size is %s', folderMeta.size);

  type ResolveFunction = (res: any) => void;
  type RejectFunction = (err: Error) => void;

  const finishCbGenerator = (resolve: ResolveFunction, reject: RejectFunction) => {
    return (err: Error | null) => {
      err ? reject(err) : resolve(null);
    }
  }

  const uploadOptionsGenerator = (resolve: ResolveFunction, reject: RejectFunction) => ({
    filename: path,
    progressCallback: (progress: number) => {
      logger.debug('Progress %s%', (progress * 100).toFixed(2));
    },
    finishedCallback: finishCbGenerator(resolve, reject)
  });

  const uploadStrategy: OneStreamStrategyObject = {
    label: 'OneStreamOnly',
    params: {
      desiredRamUsage: 200,
      source: {
        stream: directoryStream,
        hash: folderMeta.hash,
        size: folderMeta.size
      }
    }
  };

  await new Promise((resolve, reject) => {
    const state = network.upload(bucketId, uploadOptionsGenerator(resolve, reject), uploadStrategy);

    process.on('SIGINT', () => network.uploadCancel(state));
  }).then((fileId) => {
    logger.info('File upload finished. File id: %s', fileId);

    process.exit(0);
  }).catch((err) => {
    logger.error('Error uploading file: %s', err.message);

    process.exit(-1);
  });
}
