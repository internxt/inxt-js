import { config } from 'dotenv';
import { existsSync } from 'fs';
import { Command } from 'commander';

import { Environment } from '../index';
import { logger } from '../lib/utils/logger';
import { Readable } from 'stream';

config();

const program = new Command();
const version = '0.0.1';

program
  .version(version)
  .option('-v, --version', 'output the version number')
  // TODO
  // .option('-u --url <url>', 'set the base url for the api')
  // .option('-l, --log <level>', 'set the log level (default 0)')
  // .option('-d, --debug', 'set the debug log level')
  .option('-o, --only', 'use only one stream to upload the file (only for uploads)')
  .option('-u, --upload', 'upload file from provided path')
  .option('-d, --download', 'download file to provided path')
  .option('-f, --fileId <file_id>', 'file id to download (only for downloads)')
  .option('-p, --path <file_path>', 'file path where file is going to be uplaoded or downloaded');

program.parse(process.argv);

const opts = program.opts();

const network = new Environment({
  bridgePass: process.env.BRIDGE_PASS,
  bridgeUser: process.env.BRIDGE_USER,
  encryptionKey: process.env.MNEMONIC,
  bridgeUrl: process.env.BRIDGE_URL ?? opts.url
});

if (opts.upload) {
  if (!opts.path) {
    logger.error('File path not provided');

    process.exit(1);
  }

  if (!existsSync(opts.path)) {
    logger.error('File not found in provided path');

    process.exit(1);
  }

  if (opts.only) {
     
  }

  uploadFile();
} else if (opts.download) {
  if (!opts.path) {
    logger.error('File path not provided');

    process.exit(1);
  }

  if (!opts.fileId) {
    logger.error('File id not provided');

    process.exit(1);
  }

  downloadFile();
} else {
  logger.warn('Missing args');
}

function uploadFile() {
  logger.info('Uploading file located at %s', opts.path);
  logger.info('Provided params { bucketId: %s, bridgeApi: %s, bridgeUser: %s, filePath: %s }',
    process.env.BUCKET_ID,
    network.config.bridgeUrl,
    network.config.bridgeUser,
    opts.path
  );

  new Promise((resolve, reject) => {
    const state = network.storeFile(process.env.BUCKET_ID, opts.path, {
      progressCallback: (progress: number) => {
        logger.info('Progress: %s %', (progress * 100).toFixed(2));
      },
      finishedCallback: (err: Error | null, fileId: string | null) => {
        if (err) {
          reject(err);
        } else if (!fileId) {
          reject(Error('Response create entry is null'));
        } else {
          resolve(fileId);
        }
      },
      debug: (msg: string) => {
        logger.debug('DEBUG', msg);
      }
    });

    process.on('SIGINT', () => {
      network.storeFileCancel(state);
    });
  }).then((fileId) => {
    logger.info('File upload finished. File id: %s', fileId);

    process.exit(0);
  }).catch((err) => {
    logger.error('Error uploading file: %s', err.message);

    process.exit(1);
  });
}

function uploadFileOneStream() {
  logger.info('Uploading file located at %s', opts.path);
  logger.info('Provided params { bucketId: %s, bridgeApi: %s, bridgeUser: %s, filePath: %s }',
    process.env.BUCKET_ID,
    network.config.bridgeUrl,
    network.config.bridgeUser,
    opts.path
  );

  new Promise((resolve, reject) => {
    const state = network.upload(process.env.BUCKET_ID, opts.path, {
      label: 'OneStreamOnly',
      params: {
        desiredRamUsage: 200,
        source: {
          stream: Readable.from(''),
          hash: '',
          size: 0
        }
      }
    });

    process.on('SIGINT', () => {
      network.storeFileCancel(state);
    });
  }).then((fileId) => {
    logger.info('File upload finished. File id: %s', fileId);

    process.exit(0);
  }).catch((err) => {
    logger.error('Error uploading file: %s', err.message);

    process.exit(1);
  });
}

async function downloadFile() {
  logger.info('Donwloading file %s', opts.fileId);

  await new Promise((resolve, reject) => {
    const state = network.resolveFile(process.env.BUCKET_ID ?? '', opts.fileId, opts.path, {
      progressCallback: (progress: number) => {
        logger.info('Progress: %s %', (progress * 100).toFixed(2));
      },
      finishedCallback: (err: Error | null) => {
        if (err) {
          return reject(err);
        }

        resolve(null);
      },
      debug: (msg: string) => {
        logger.debug('DEBUG', msg);
      }
    });

    process.on('SIGINT', () => {
      network.resolveFileCancel(state);
    });
  }).then(() => {
    logger.info('File downloaded on path %s', opts.path);

    process.exit(0);
  }).catch((err) => {
    logger.error('Error uploading file %s', err.message);

    process.exit(1);
  });
}

setTimeout(() => {

}, 50000000);