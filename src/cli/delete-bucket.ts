import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';

export function deleteBucket(bucketId: string): Promise<void> {
  logger.info('Deleting bucket %s', bucketId);

  const network = getEnvironment();

  return network
    .deleteBucket(bucketId)
    .then(() => {
      logger.info('Bucket %s deleted', bucketId);
    })
    .catch((err) => {
      logger.error('Bucket deletion error: %s', err.message);
    });
}
