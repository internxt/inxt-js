"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawn = void 0;
var node_1 = require("../node");
var crypto_1 = require("crypto");
var bridge_1 = require("../bridge");
var spawnNode = function (spawner) {
    var port = spawner.port ? spawner.port : 3000;
    var path = spawner.path ? spawner.path : '/shards';
    var ID = spawner.ID ? spawner.ID : crypto_1.randomBytes(32).toString('hex');
    var hostname = spawner.hostname ? spawner.hostname : 'www.fakenode.com';
    return new node_1.NodeMock(port, path, ID, hostname);
};
var spawnMirror = function (spawner) {
    var node = spawner.node ? spawner.node : spawnNode({});
    var bridge = spawner.bridge ? spawner.bridge : spawnBridge({});
    return new bridge_1.MirrorMock(node, bridge);
};
var spawnBridge = function (spawner) {
    var mirrors = spawner.mirrors ? spawner.mirrors : [spawnShardReferenced({})];
    return new bridge_1.BridgeMock(mirrors);
};
var spawnShardReferenced = function (spawner) {
    var index = spawner.index ? spawner.index : 0;
    var hash = spawner.hash ? spawner.hash : crypto_1.randomBytes(32).toString('hex');
    var size = spawner.size ? spawner.size : 10000;
    var parity = spawner.parity ? spawner.parity : true;
    var token = spawner.token ? spawner.token : crypto_1.randomBytes(32).toString('hex');
    var farmer = spawner.farmer ? spawner.farmer : {
        userAgent: 'Mozilla 5.0',
        protocol: '1.2.0-INXT',
        address: 'www.fakeaddress.com',
        port: 3000,
        nodeID: crypto_1.randomBytes(32).toString('hex'),
        lastSeen: new Date()
    };
    var operation = spawner.operation ? spawner.operation : '';
    var fileId = spawner.fileId ? spawner.fileId : crypto_1.randomBytes(32).toString('hex');
    var bucketId = spawner.bucketId ? spawner.bucketId : crypto_1.randomBytes(32).toString('hex');
    return { index: index, replaceCount: 0, hash: hash, size: size, parity: parity, token: token, farmer: farmer, operation: operation, fileId: fileId, bucketId: bucketId };
};
exports.spawn = {
    node: spawnNode,
    mirror: spawnMirror,
    bridge: spawnBridge,
    shardReferenced: spawnShardReferenced
};
