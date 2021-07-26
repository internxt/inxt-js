"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineShardSize = exports.determineParityShards = exports._determineShardSize = exports.determineConcurrency = void 0;
var constants_1 = require("../../api/constants");
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
function shardSize(hops) {
    return constants_1.MIN_SHARD_SIZE * Math.pow(2, hops);
}
function _determineShardSize(fileSize, accumulator) {
    if (accumulator === void 0) { accumulator = 0; }
    if (fileSize < 0) {
        return 0;
    }
    var hops = ((accumulator - constants_1.SHARD_MULTIPLE_BACK) < 0) ? 0 : accumulator - constants_1.SHARD_MULTIPLE_BACK;
    var byteMultiple = shardSize(accumulator);
    var check = fileSize / byteMultiple;
    if (check > 0 && check <= 1) {
        while (hops > 0 && shardSize(hops) > constants_1.MAX_SHARD_SIZE) {
            hops = hops - 1 <= 0 ? 0 : hops - 1;
        }
        return shardSize(hops);
    }
    if (accumulator > 41) {
        return 0;
    }
    return _determineShardSize(fileSize, ++accumulator);
}
exports._determineShardSize = _determineShardSize;
function determineParityShards(totalShards) {
    return Math.ceil(totalShards * 2 / 3);
}
exports.determineParityShards = determineParityShards;
/**
 * Determines the best shard size for a provided file size
 * @param fileSize Size of the file to be sharded
 * @returns Shard size
 */
function determineShardSize(fileSize) {
    var fiftyMb = 50 * 1024 * 1024;
    return Math.min(fiftyMb, _determineShardSize(fileSize));
}
exports.determineShardSize = determineShardSize;
