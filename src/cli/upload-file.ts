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
    const abortController = new AbortController();

    process.on('SIGINT', () => {
      logger.info('Aborting upload');
      abortController.abort();
    });

    const fileId = await network.upload(bucketId, {
      progressCallback: (progress: number) => {
        logger.info('Progress %s%', (progress * 100).toFixed(2));
      },
      fileSize: statSync(filepath).size,
      source: createReadStream(filepath),
      abortSignal: abortController.signal,
    });

    console.log('File %s uploaded', fileId);
  } catch (err) {
    logger.error('Error uploading file: %s', (err as Error).message ?? '');
    process.exit(-1);
  }
}
