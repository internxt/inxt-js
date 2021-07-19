"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineShardSize = exports.determineConcurrency = void 0;
var rs_wrapper_1 = require("rs-wrapper");
/**
 * Determines the best concurrency number of chunks in memory to fit
 * desired ram usage
 * @param desiredRamUsage Desired ram usage in bytes
 * @param fileSize Size of the file to work with
 * @returns Concurrency number
 */
function determineConcurrency(desiredRamUsage, fileSize) {
    var shardSize = determineShardSize(fileSize);
    return Math.floor(desiredRamUsage / shardSize);
}
exports.determineConcurrency = determineConcurrency;
/**
 * Determines the best shard size for a provided file size
 * @param fileSize Size of the file to be sharded
 * @returns Shard size
 */
function determineShardSize(fileSize) {
    var fiftyMb = 50 * 1024 * 1024;
    return Math.min(fiftyMb, rs_wrapper_1.utils.determineShardSize(fileSize));
}
exports.determineShardSize = determineShardSize;
