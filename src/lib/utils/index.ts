import { MAX_SHARD_SIZE, MIN_SHARD_SIZE, SHARD_MULTIPLE_BACK } from '../../api/constants';

/**
 * Determines the best concurrency number of chunks in memory to fit
 * desired ram usage
 * @param desiredRamUsage Desired ram usage in bytes
 * @param fileSize Size of the file to work with
 * @returns Concurrency number
 */
export function determineConcurrency(desiredRamUsage: number, fileSize: number): number {
  const shardSize = determineShardSize(fileSize);

  return Math.floor(desiredRamUsage / shardSize);
}

function shardSize(hops: number): number {
  return MIN_SHARD_SIZE * Math.pow(2, hops);
}

export function _determineShardSize(fileSize: number, accumulator = 0): number {
  if (fileSize < 0) {
    return 0;
  }

  let hops = accumulator - SHARD_MULTIPLE_BACK < 0 ? 0 : accumulator - SHARD_MULTIPLE_BACK;

  const byteMultiple = shardSize(accumulator);

  const check = fileSize / byteMultiple;

  if (check > 0 && check <= 1) {
    while (hops > 0 && shardSize(hops) > MAX_SHARD_SIZE) {
      hops = hops - 1 <= 0 ? 0 : hops - 1;
    }

    return shardSize(hops);
  }

  if (accumulator > 41) {
    return 0;
  }

  return _determineShardSize(fileSize, ++accumulator);
}

export function determineParityShards(totalShards: number) {
  return Math.ceil((totalShards * 2) / 3);
}

/**
 * Determines the best shard size for a provided file size
 * @param fileSize Size of the file to be sharded
 * @returns Shard size
 */
export function determineShardSize(fileSize: number) {
  const fiftyMb = 50 * 1024 * 1024;

  return Math.min(fiftyMb, _determineShardSize(fileSize));
}
