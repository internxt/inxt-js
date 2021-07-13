"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTree = exports.getChallenges = exports.merkleTree = exports.preleaf = void 0;
var crypto_1 = require("./crypto");
var crypto_2 = require("crypto");
var SHARD_CHALLENGES = 4;
function arrayBufferToString(array) {
    return array.map(function (b) {
        return b.toString("hex");
    });
}
function preleaf(challenge, encrypted) {
    var preleafContent = Buffer.concat([challenge, encrypted]);
    return crypto_1.ripemd160(crypto_1.sha256(preleafContent));
}
exports.preleaf = preleaf;
function preleafArray(encrypted, challenge) {
    var preleafArray = challenge.map(function (challenge) {
        return Buffer.concat([challenge, encrypted]);
    });
    return preleafArray;
}
function leaf(preleaf) {
    return crypto_1.ripemd160(crypto_1.sha256(preleaf));
}
function leafArray(preleafArray) {
    return preleafArray.map(function (preleaf) {
        return leaf(preleaf);
    });
}
/*
function getChallenges(): Buffer[] {
  let challenges: Buffer[] = new Array(SHARD_CHALLENGES);
  for (let i = 0; i < SHARD_CHALLENGES; i++) {
    challenges.push(randomBytes(16))
  }
  return challenges
}
*/
function challenge() {
    return crypto_2.randomBytes(16);
}
function challengeArray() {
    var challengeArray = [];
    for (var i = 0; i < SHARD_CHALLENGES; i++) {
        challengeArray.push(challenge());
    }
    return challengeArray;
}
function merkleTree(encrypted) {
    // set the challenges randomnly
    var challenges = challengeArray();
    var preleaves = preleafArray(encrypted, challenges);
    var leaves = leafArray(preleaves);
    return {
        leaf: arrayBufferToString(leaves),
        challenges: challenges,
        challenges_as_str: arrayBufferToString(challenges),
        preleaf: preleaves
    };
}
exports.merkleTree = merkleTree;
function getChallenges(mT) {
    var challenges = mT.challenges.map(function (challengeBuffer) {
        return challengeBuffer.toString("hex");
    });
    return challenges;
}
exports.getChallenges = getChallenges;
function getTree(mT) {
    var tree = mT.leaf.map(function (leafBuffer) {
        return leafBuffer.toString();
    });
    return tree;
}
exports.getTree = getTree;
