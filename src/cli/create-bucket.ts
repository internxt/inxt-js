import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';

export function createBucket(bucketName: string): Promise<void> {
  logger.info('Creating bucket %s', bucketName);

  const network = getEnvironment();

  return network
    .createBucket(bucketName)
    .then((bucketId: string) => {
      logger.info('Bucket %s created with id %s', bucketName, bucketId);
    })
    .catch((err) => {
      logger.error('Bucket creation error: %s', err.message);
    });
}
