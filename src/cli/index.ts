import { config } from 'dotenv';
import { createReadStream, createWriteStream, existsSync, statSync } from 'fs';
import { Command } from 'commander';
import { Readable } from 'stream';

import { basename } from 'path';

import { Environment } from '../index';
import { logger } from '../lib/utils/logger';

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
    .option('-u, --upload', 'upload file from provided path')
    .option('-d, --download', 'download file to provided path')
    .option('-f, --fileId', 'file id to download (only for downloads)')
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

    uploadFile();
}

if (opts.download) { 
    if (!opts.path) {
        logger.error('File path not provided');

        process.exit(1);
    }

    if (!opts.fileId) {
        logger.error('File id not provided');

        process.exit(1);
    }

    downloadFile();
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
        network.storeFile(process.env.BUCKET_ID, {
            fileContent: createReadStream(opts.path),
            fileSize: statSync(opts.path).size,
            filename: basename(opts.path),
            progressCallback: (progress: number) => {
                logger.info('Progress: %s', (progress * 100).toFixed(2));
            },
            finishedCallback: (err: Error | null, res) => {
                if (err) {
                    reject(err);
                } else if (!res) {
                    reject(Error('Response create entry is null'))
                } else {
                    resolve(res.id);
                }
            }
        });
    }).then((fileId) => {
        logger.info('File upload finished. File id: %s', fileId);

        process.exit(0);
    }).catch((err) => {
        logger.error('Error uploading file %s', err.message);

        process.exit(1);
    });
}

function downloadFile() {
    logger.info('Donwloading file %s', opts.fileId);

    new Promise((resolve: (r: Readable) => void, reject) => {
        network.resolveFile(process.env.BUCKET_ID ?? '', opts.fileId, {
            progressCallback: (progress: number) => {
                logger.info('Progress: %s', (progress * 100).toFixed(2));
            },
            finishedCallback: (err: Error | null, res: Readable | null) => {
                if (err) {
                    reject(err);
                } else if (!res) {
                    reject(Error('Readable is null'));
                } else {
                    resolve(res);
                }
            }
        });
    }).then((fileStream) => {
        logger.info('Downloading file');
        fileStream.pipe(createWriteStream(opts.path))
            .on('close', () => {
                logger.info('File downloaded on path %s', opts.path);

                process.exit(0);
            })
            .on('error', (err) => {
                logger.error('Error downloading file %s', err.message);
                logger.error(err);

                process.exit(1);
            });
    }).catch((err) => {
        logger.error('Error uploading file %s', err.message);
        process.exit(1);
    })
}

logger.warn('Missing args');

