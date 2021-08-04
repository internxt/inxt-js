"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetFileMirrors = exports.ReplacePointer = exports.GetFileMirror = exports.GetFileInfo = void 0;
var async_1 = require("async");
var request_1 = require("../services/request");
function GetFileInfo(config, bucketId, fileId, token) {
    var body = token ? { headers: { 'x-token': token } } : {};
    return request_1.request(config, 'get', config.bridgeUrl + "/buckets/" + bucketId + "/files/" + fileId + "/info", body, false)
        .then(function (res) { return res.data; })
        .catch(function (err) {
        var _a;
        switch ((_a = err.response) === null || _a === void 0 ? void 0 : _a.status) {
            case 404:
                throw Error(err.response.data.error);
            default:
                throw Error('Unhandled error: ' + err.message);
        }
    });
}
exports.GetFileInfo = GetFileInfo;
function GetFileMirror(config, bucketId, fileId, limit, skip, excludeNodes, token) {
    if (excludeNodes === void 0) { excludeNodes = []; }
    var excludeNodeIds = excludeNodes.join(',');
    var targetUrl = config.bridgeUrl + "/buckets/" + bucketId + "/files/" + fileId + "?limit=" + limit + "&skip=" + skip + "&exclude=" + excludeNodeIds;
    var params = {
        responseType: 'json',
        headers: token ? { 'x-token': token } : {}
    };
    return request_1.request(config, 'GET', targetUrl, params, false)
        .then(function (res) { return res.data; });
}
exports.GetFileMirror = GetFileMirror;
function ReplacePointer(config, bucketId, fileId, pointerIndex, excludeNodes) {
    if (excludeNodes === void 0) { excludeNodes = []; }
    return GetFileMirror(config, bucketId, fileId, 1, pointerIndex, excludeNodes);
}
exports.ReplacePointer = ReplacePointer;
function GetFileMirrors(config, bucketId, fileId, token) {
    var shards = [];
    return async_1.doUntil(function (next) {
        GetFileMirror(config, bucketId, fileId, 3, shards.length, [], token).then(function (results) {
            results.forEach(function (shard) {
                shards.push(shard);
            });
            next(null, results, shards);
        }).catch(function (err) {
            next(err);
        });
    }, function (results, totalShard, next) {
        return next(null, results.length === 0);
    }).then(function (result) { return result[1]; });
}
exports.GetFileMirrors = GetFileMirrors;
