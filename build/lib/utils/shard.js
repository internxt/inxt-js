"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalDataShards = exports.computeShardSize = void 0;
function computeShardSizeBits(fileSize) {
    // Check if fileSize == 0
    if (fileSize == 0) {
        return 0;
    }
    var MIN_SHARD_SIZE = 2097152; // 2Mb
    var MAX_SHARD_SIZE = 4294967296; // 4 Gb
    var SHARD_MULTIPLES_BACK = 4;
    var shardSize = function (hops) {
        return MIN_SHARD_SIZE * Math.pow(2, hops);
    };
    // Maximum of 2 ^ 41 * 8 * 1024 * 1024
    for (var accumulator = 0; accumulator < 41; accumulator++) {
        var hops = ((accumulator - SHARD_MULTIPLES_BACK) < 0) ?
            0 : accumulator - SHARD_MULTIPLES_BACK;
        var byteMultiple = shardSize(accumulator);
        var check = fileSize / byteMultiple;
        if (check > 0 && check <= 1) {
            while (hops > 0 && shardSize(hops) > MAX_SHARD_SIZE) {
                hops = hops - 1 <= 0 ? 0 : hops - 1;
            }
            return shardSize(hops);
        }
    }
    return 0;
}
// Returns the shard size in Bytes
function computeShardSize(fileSize) {
    var fileSizeBits = fileSize * 8;
    var shardSizeBits = computeShardSizeBits(fileSizeBits);
    // return the number of bytes
    var shardBytes = Math.ceil(shardSizeBits / 8);
    return shardBytes;
}
exports.computeShardSize = computeShardSize;
// Returns the number of shards
function totalDataShards(fileSize) {
    // Convert to bits
    var fileSizeBits = fileSize * 8;
    var totalShards = Math.ceil(fileSizeBits / computeShardSize(fileSizeBits));
    return totalShards;
}
exports.totalDataShards = totalDataShards;
