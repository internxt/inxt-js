"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetFileMirrors = exports.GetFileMirror = exports.GetFileInfo = void 0;
var async_1 = require("async");
var request_1 = require("../services/request");
function GetFileInfo(config, bucketId, fileId) {
    return request_1.request(config, 'GET', "https://api.internxt.com:8081/" + config.bridgeUrl + "/buckets/" + bucketId + "/files/" + fileId + "/info", { responseType: 'json' }, function () { }).then(function (res) {
        if (res.status !== 200) {
            throw res;
        }
        return res.data;
    });
}
exports.GetFileInfo = GetFileInfo;
function GetFileMirror(config, bucketId, fileId, limit, skip, excludeNodes) {
    if (excludeNodes === void 0) { excludeNodes = []; }
    var excludeNodeIds = excludeNodes.join(',');
    console.log('Excluded', excludeNodes);
    return request_1.request(config, 'GET', "https://api.internxt.com:8081/" + config.bridgeUrl + "/buckets/" + bucketId + "/files/" + fileId + "?limit=" + limit + "&skip=" + skip + "&exclude=" + excludeNodeIds, { responseType: 'json' }, function () { }).then(function (res) {
        if (res.status !== 200) {
            throw res;
        }
        return res.data;
    });
}
exports.GetFileMirror = GetFileMirror;
function GetFileMirrors(config, bucketId, fileId) {
    var shards = [];
    return async_1.doUntil(function (next) {
        GetFileMirror(config, bucketId, fileId, 3, shards.length).then(function (results) {
            shards.push.apply(shards, results);
            next(null, results, shards);
        }).catch(next);
    }, function (results, totalShard, next) {
        return next(null, results.length === 0);
    }).then(function (result) {
        return result[1];
    });
}
exports.GetFileMirrors = GetFileMirrors;
