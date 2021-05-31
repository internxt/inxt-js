"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShardMeta = void 0;
var merkleTree_1 = require("./merkleTree");
var crypto_1 = require("./crypto");
var getShardHash = function (encryptedShardData) { return crypto_1.ripemd160(crypto_1.sha256(encryptedShardData)); };
function getShardMeta(encryptedShardData, fileSize, index, parity, exclude) {
    var mT = merkleTree_1.merkleTree(encryptedShardData);
    return {
        hash: getShardHash(encryptedShardData).toString("hex"),
        size: fileSize,
        index: index,
        parity: parity,
        challenges_as_str: mT.challenges_as_str,
        tree: mT.leaf
    };
}
exports.getShardMeta = getShardMeta;
