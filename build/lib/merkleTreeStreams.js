"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMerkleTree = void 0;
var async_1 = require("async");
var crypto_1 = require("crypto");
var crypto_2 = require("./crypto");
var hasher_1 = require("./hasher");
function generateChallenges(nChallenges) {
    var challenges = [];
    for (var i = 0; i < nChallenges; i++) {
        challenges.push(crypto_1.randomBytes(16));
    }
    return challenges;
}
function generatePreleaf(encrypted, challenge) {
    var hashStream = new hasher_1.HashStream();
    hashStream.write(challenge);
    return new Promise(function (resolve, reject) {
        encrypted.pipe(hashStream)
            .on('data', function () { })
            .on('error', function (err) {
            reject(err);
        })
            .on('end', function () {
            resolve(hashStream.getHash());
        });
    });
}
function generatePreleaves(encrypted, challenges) {
    var preleaves = [];
    return async_1.eachLimit(challenges, 1, function (challenge, next) {
        generatePreleaf(encrypted.getStream(), challenge)
            .then(function (preleaf) {
            preleaves.push(preleaf);
            next();
        }).catch(function (err) {
            next(err);
        });
    }).then(function () {
        return preleaves;
    });
}
function generateLeaf(preleaf) {
    return crypto_2.ripemd160(crypto_2.sha256(preleaf));
}
function generateLeaves(preleaves) {
    return preleaves.map(generateLeaf);
}
function generateMerkleTree() {
    return {
        leaf: [
            '0000000000000000000000000000000000000000',
            '0000000000000000000000000000000000000000',
            '0000000000000000000000000000000000000000',
            '0000000000000000000000000000000000000000'
        ],
        challenges: [
            Buffer.from('00000000000000000000000000000000', 'hex'),
            Buffer.from('00000000000000000000000000000000', 'hex'),
            Buffer.from('00000000000000000000000000000000', 'hex'),
            Buffer.from('00000000000000000000000000000000', 'hex')
        ],
        challenges_as_str: [
            '00000000000000000000000000000000',
            '00000000000000000000000000000000',
            '00000000000000000000000000000000',
            '00000000000000000000000000000000'
        ],
        preleaf: [
            Buffer.from('0000000000000000000000000000000000000000', 'hex'),
            Buffer.from('0000000000000000000000000000000000000000', 'hex'),
            Buffer.from('0000000000000000000000000000000000000000', 'hex'),
            Buffer.from('0000000000000000000000000000000000000000', 'hex')
        ]
    };
}
exports.generateMerkleTree = generateMerkleTree;
