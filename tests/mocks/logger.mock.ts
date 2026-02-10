import { logger } from '../../src/lib/utils/logger';

export function getSilentLogger() {
  logger.silent = true;

  return logger;
}
