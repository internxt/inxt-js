import { createReadStream, existsSync, statSync } from 'fs';

import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';
import { EnvService } from './EnvService';

export async function uploadFile(filepath: string) {
  if (!existsSync(filepath)) {
    logger.error('File "%s" does not exist', filepath);
    return process.exit(-1);
  }

  try {
    const network = getEnvironment();

    const bucketId = EnvService.instance.get('BUCKET_ID');

    const fileId = await new Promise((resolve: (fileId: string) => void, reject) => {
      const state = network.upload(bucketId, {
        progressCallback: (progress: number) => {
          logger.info('Progress %s%', (progress * 100).toFixed(2));
        },
        finishedCallback: (err: Error | null, res: string | null) => {
          if (err) {
            return reject(err);
          } else if (!res) {
            return reject('No response received from Network download');
          }
          resolve(res);
        },
        fileSize: statSync(filepath).size,
        source: createReadStream(filepath),
      });

      process.on('SIGINT', () => {
        logger.info('Aborting upload');
        network.uploadCancel(state);
      });
    });

    console.log('File %s uploaded', fileId);
  } catch (err) {
    logger.error('Error uploading file: %s', (err as Error).message ?? '');
    process.exit(-1);
  }
}
