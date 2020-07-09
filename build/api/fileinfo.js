"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetFileMirrors = exports.GetFileInfo = void 0;
var auth_1 = require("./auth");
var async_1 = require("async");
function GetFileInfo(config, bucketId, fileId) {
    return global.fetch("https://api.internxt.com:8081/" + config.bridgeUrl + "/buckets/" + bucketId + "/files/" + fileId + "/info", {
        mode: 'cors',
        headers: {
            'authorization': auth_1.GetBasicAuth(config)
        }
    }).then(function (res) {
        if (res.status !== 200) {
            throw res;
        }
        return res.json();
    });
}
exports.GetFileInfo = GetFileInfo;
function GetFileMirror(config, bucketId, fileId, limit, skip) {
    return global.fetch("https://api.internxt.com:8081/" + config.bridgeUrl + "/buckets/" + bucketId + "/files/" + fileId + "?limit=" + limit + "&skip=" + skip, {
        headers: { 'authorization': auth_1.GetBasicAuth(config) }
    }).then(function (res) {
        if (res.status !== 200) {
            throw res;
        }
        return res.json();
    });
}
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
