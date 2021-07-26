/**
 * Determines the best concurrency number of chunks in memory to fit
 * desired ram usage
 * @param desiredRamUsage Desired ram usage in bytes
 * @param fileSize Size of the file to work with
 * @returns Concurrency number
 */
export declare function determineConcurrency(desiredRamUsage: number, fileSize: number): number;
export declare function _determineShardSize(fileSize: number, accumulator?: number): number;
export declare function determineParityShards(totalShards: number): number;
/**
 * Determines the best shard size for a provided file size
 * @param fileSize Size of the file to be sharded
 * @returns Shard size
 */
export declare function determineShardSize(fileSize: number): number;
