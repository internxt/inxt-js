"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShardReferenced = exports.BridgeMock = exports.BRIDGE_ERRORS = void 0;
var crypto_1 = require("crypto");
exports.BRIDGE_ERRORS = {
    DEFAULT: 'bridge error'
};
var BridgeMock = /** @class */ (function () {
    function BridgeMock(mirrors) {
        this.DEFAULT_BRIDGE_ERROR_MESSAGE = 'bridge reject';
        this.mirrors = mirrors;
    }
    // fileinfo.ts 'GetFileMirror'
    BridgeMock.prototype.GetFileMirror = function (config, bucketId, fileId, limit, skip, excludeNodes) {
        if (excludeNodes === void 0) { excludeNodes = []; }
        var mirrorsIncluded = [];
        var _loop_1 = function (mirror) {
            if (excludeNodes.findIndex(function (nodeId) { return nodeId === mirror.farmer.nodeID; }) === -1) {
                mirrorsIncluded.push(mirror);
            }
        };
        for (var _i = 0, _a = this.mirrors; _i < _a.length; _i++) {
            var mirror = _a[_i];
            _loop_1(mirror);
        }
        var mirrorsLimited = this._limit(mirrorsIncluded.filter(function (m) { return m.fileId === fileId && m.bucketId === bucketId; }), limit);
        var mirrorsSkipped = this._skip(mirrorsLimited, skip);
        return Promise.resolve(mirrorsSkipped);
    };
    BridgeMock.prototype._limit = function (m, limit) {
        return m.slice(0, limit);
    };
    BridgeMock.prototype._skip = function (m, skip) {
        return m.slice(skip, m.length);
    };
    BridgeMock.prototype.resolve = function () {
        return Promise.resolve(true);
    };
    BridgeMock.prototype.reject = function () {
        return Promise.reject(exports.BRIDGE_ERRORS.DEFAULT);
    };
    return BridgeMock;
}());
exports.BridgeMock = BridgeMock;
exports.generateShardReferenced = function (index, hash, nodeID, fileId, bucketId) {
    return {
        index: index,
        replaceCount: 0,
        hash: crypto_1.randomBytes(32).toString('hex'),
        size: 10000,
        parity: true,
        token: crypto_1.randomBytes(32).toString('hex'),
        farmer: {
            userAgent: 'Mozilla 5.0',
            protocol: '1.2.0-INXT',
            address: 'www.fakeaddress.com',
            port: 3000,
            nodeID: nodeID,
            lastSeen: new Date()
        },
        operation: '',
        fileId: fileId,
        bucketId: bucketId
    };
};
