import { utils } from 'rs-wrapper';

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

export function determineShardSize(fileSize: number) {
    const fiftyMb = 50 * 1024 * 1024;

    return Math.min(fiftyMb, utils.determineShardSize(fileSize));
}
