import { createWriteStream } from 'fs';
import { pipeline, Readable } from 'stream';

import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';

export async function downloadFileMultipart(fileId: string, fileSize: number, path: string) {
  logger.info('Downloading file %s', fileId);

  const network = getEnvironment();
  const bucketId = process.env.BUCKET_ID;

  const destination = createWriteStream(path);

  try {
    await new Promise((resolve, reject) => {
      const state = network.downloadMultipartFile(
        fileId, 
        fileSize,
        bucketId as string,
        {
          progressCallback: (progress: number) => {
            logger.info('Progress: %s %', (progress * 100).toFixed(2));
          },
          finishedCallback: (err: Error | null, downloadStream: Readable | null) => {
            if (err) {
              return reject(err);
            }

            pipeline(downloadStream as Readable, destination, (err) => {
              if (err) {
                return reject(err);
              }
              resolve(null);
            });
          },
        },
      );

      process.on('SIGINT', () => {
        network.downloadCancel(state);
      });
    });
    logger.info('File downloaded on path %s', path);

    process.exit(0);
  } catch (err) {
    logger.error('Error downloading file %s', err.message);

    process.exit(1);
  }
}
