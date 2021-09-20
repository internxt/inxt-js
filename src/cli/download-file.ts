import { createWriteStream } from "fs";
import { Readable } from "stream";
import { DownloadStrategyLabel } from "../lib/download";
import { logger } from "../lib/utils/logger";
import { getEnvironment } from "./CommandInterface";

export async function downloadFile(fileId: string, path: string) {
  logger.info('Donwloading file %s', fileId);

  const network = getEnvironment();
  const bucketId = process.env.BUCKET_ID;

  await new Promise((resolve, reject) => {
    const state = network.download(bucketId, fileId, {
      progressCallback: (progress: number) => {
        logger.info('Progress: %s %', (progress * 100).toFixed(2));
      },
      finishedCallback: (err: Error | null, downloadStream: Readable | null) => {
        if (err) {
          return reject(err);
        }

        (downloadStream as Readable).pipe(createWriteStream(path))
          .once('error', reject)
          .once('finish', resolve)
      },
      debug: (msg: string) => {
        logger.debug('DEBUG', msg);
      }
    }, {
      label: 'OneStreamOnly',
      params: {}
    });

    process.on('SIGINT', () => {
      network.resolveFileCancel(state);
    });
  }).then(() => {
    logger.info('File downloaded on path %s', path);

    process.exit(0);
  }).catch((err) => {
    logger.error('Error uploading file %s', err.message);

    process.exit(1);
  });
}

export async function downloadFileParallel(fileId: string, path: string, strategy?: DownloadStrategyLabel) {
  logger.info('Donwloading file %s', fileId);

  const network = getEnvironment();
  const bucketId = process.env.BUCKET_ID;

  await new Promise((resolve, reject) => {
    const state = network.download(bucketId, fileId, {
      progressCallback: (progress: number) => {
        logger.info('Progress: %s %', (progress * 100).toFixed(2));
      },
      finishedCallback: (err: Error | null, downloadStream: Readable | null) => {
        if (err) {
          return reject(err);
        }

        (downloadStream as Readable).pipe(createWriteStream(path))
          .once('error', reject)
          .once('finish', resolve)
      },
      debug: (msg: string) => {
        logger.debug('DEBUG', msg);
      }
    }, {
      label: 'MultipleStreams',
      params: {}
    });

    process.on('SIGINT', () => {
      network.resolveFileCancel(state);
    });
  }).then(() => {
    logger.info('File downloaded on path %s', path);

    process.exit(0);
  }).catch((err) => {
    logger.error('Error uploading file %s', err.message);

    process.exit(1);
  });
}
