"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShardMeta = void 0;
var merkleTree_1 = require("./merkleTree");
var crypto_1 = require("./crypto");
function getShardHash(encryptedShardData) {
    var shardHash = crypto_1.ripemd160(crypto_1.sha256(encryptedShardData));
    return shardHash;
}
function getShardMeta(encryptedShardData, fileSize, index, is_parity, exclude) {
    var mT = merkleTree_1.merkleTree(encryptedShardData);
    var shardMeta = {
        hash: getShardHash(encryptedShardData).toString("hex"),
        size: fileSize,
        index: index,
        is_parity: is_parity,
        challenges_as_str: mT.challenges_as_str,
        tree: mT.leaf
    };
    return shardMeta;
}
exports.getShardMeta = getShardMeta;
function getShardMerkleTree(encryptedShardData) {
    var mT = merkleTree_1.merkleTree(encryptedShardData);
    return mT;
}
