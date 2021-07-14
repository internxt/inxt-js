"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploaderStream = void 0;
var stream_1 = require("stream");
var UploaderStream = /** @class */ (function (_super) {
    __extends(UploaderStream, _super);
    function UploaderStream(parallelUploads, fileObject, shardSize, maxConcurrentBytes, options) {
        if (parallelUploads === void 0) { parallelUploads = 1; }
        var _this = _super.call(this, options) || this;
        _this.indexCounter = 0;
        _this.pendingShards = [];
        _this.limitOffset = 0;
        _this.uploads = [];
        _this.parallelUploads = parallelUploads;
        _this.fileObject = fileObject;
        _this.maxConcurrentBytes = maxConcurrentBytes || shardSize;
        return _this;
    }
    UploaderStream.prototype.getShardsMeta = function () {
        return this.uploads;
    };
    UploaderStream.prototype._transform = function (chunk, enc, cb) {
        var _this = this;
        if (this.parallelUploads > 1) {
            // TODO
            return cb(null, null);
        }
        // console.log('Uploading shard %s chunkSize %s', this.indexCounter, chunk.length);
        this.fileObject.uploadShard(chunk, chunk.length, this.fileObject.frameId, this.indexCounter++, 3, false)
            .then(function (shardMeta) {
            _this.uploads.push(shardMeta);
            _this.emit('upload-progress', chunk.length);
            // console.log('Shard with index %s uploaded', this.indexCounter - 1);
            cb(null, null);
        })
            .catch(function (err) {
            cb(err, null);
        });
    };
    UploaderStream.prototype._flush = function (cb) {
        cb();
    };
    return UploaderStream;
}(stream_1.Transform));
exports.UploaderStream = UploaderStream;
