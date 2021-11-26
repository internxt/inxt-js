import { createReadStream, existsSync, statSync } from 'fs';
import { v4 } from 'uuid';

import { UploadStrategyObject, UploadOptions } from '../lib/core';
import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';

export async function uploadFile(filepath: string, concurrency: number) {
  if (!existsSync(filepath)) {
    logger.error('File "%s" does not exist', filepath);
    process.exit(-1);
  }

  try {
    const network = getEnvironment();

    const uuid = v4();
    const bucketId = process.env.BUCKET_ID;
    const uploadStrategy: UploadStrategyObject = {
      label: 'OneStreamOnly',
      params: {
        source: {
          stream: createReadStream(filepath),
          size: statSync(filepath).size
        },
        useProxy: false,
        concurrency
      }
    };

    await new Promise((resolve, reject) => {
      const uploadOpts: UploadOptions = {
        name: uuid,
        progressCallback: (progress: number) => {
          logger.debug('Progress %s%', (progress * 100).toFixed(2));
        },
        finishedCallback: (err: Error | null, res: string | null) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        }
      };

      const state = network.upload(bucketId, uploadOpts, uploadStrategy);

      process.on('SIGINT', () => {
        logger.info('Aborting upload');
        network.uploadCancel(state);
      });
    });
  } catch (err) {
    console.log(err);
    logger.error('Error uploading file: %s', err.message);
    process.exit(-1);
  }  
}
