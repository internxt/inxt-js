import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';

export function renameFile(fileId: string, newPlainName: string): Promise<void> {
  logger.info('Renaming file %s', fileId);

  const network = getEnvironment();
  const bucketId = process.env.BUCKET_ID as string;

  return network
    .renameFile(bucketId, fileId, newPlainName)
    .then(() => {
      logger.info('File %s renamed', fileId);
    })
    .catch((err) => {
      logger.error('There was an error renaming file %s: %s', fileId, err.message);
    });
}
