import { logger } from '../lib/utils/logger';
import { getEnvironment } from './CommandInterface';

export async function getDownloadLinks(bucketId: string, fileIds: string[]): Promise<void> {
  const network = getEnvironment();

  try {
    const response = await network.getDownloadLinks(bucketId, fileIds);
    logger.info(`getDownloadLinks response: ${JSON.stringify(response, null, 2)}`);
  } catch (err) {
    logger.error(`Something went wrong while getting download links ${(err as Error).message ?? ''}`);
  }
}
