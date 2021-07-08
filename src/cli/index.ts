import { Command } from "commander";
import { Environment } from '../index';
import { config } from 'dotenv';
import { createReadStream, createWriteStream, fstat, statSync } from "fs";
import path from "path/posix";
import { logger } from "../lib/utils/logger";
import { Readable } from "stream";

config();

const program = new Command();

program
    .option('-u, --upload', 'upload file from provided path')
    .option('-d, --download', 'download file to provided path')
    .option('-f, --fileId', 'file id to download (only for downloads)')
    .option('-p, --path', 'file path where file is going to be uplaoded or downloaded');

program.parse(process.argv);

const opts = program.opts();

const network = new Environment({
    bridgePass: process.env.BRIDGE_PASS,
    bridgeUser: process.env.BRIDGE_USER,
    encryptionKey: process.env.MNEMONIC,
    bridgeUrl: process.env.BRIDGE_URL
});

if (opts.upload && opts.path) {
    new Promise((resolve, reject) => {
        network.storeFile(process.env.BUCKET_ID, {
            fileContent: createReadStream(opts.path),
            fileSize: statSync(opts.path).size,
            filename: path.basename(opts.path),
            progressCallback: (progress: number) => {
                logger.info('Progress: %s', (progress * 100).toFixed(2));
            },
            finishedCallback: (err: Error, res) => {
                if (err) {
                    reject(err);
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

if (opts.download && opts.path && opts.fileId) {
    new Promise((resolve: (r: Readable) => void, reject) => {
        network.resolveFile(process.env.BUCKET_ID, opts.fileId, {
            progressCallback: (progress: number) => {
                logger.info('Progress: %s', (progress * 100).toFixed(2));
            },
            finishedCallback: (err: Error, res: Readable) => {
                if (err) {
                    reject(err);
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

process.exit(1);

