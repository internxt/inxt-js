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
exports.UploaderQueue = void 0;
var stream_1 = require("stream");
var concurrentQueue_1 = require("../concurrentQueue");
var error_1 = require("../utils/error");
var UploaderQueue = /** @class */ (function (_super) {
    __extends(UploaderQueue, _super);
    function UploaderQueue(parallelUploads, expectedUploads, fileObject) {
        if (parallelUploads === void 0) { parallelUploads = 1; }
        if (expectedUploads === void 0) { expectedUploads = 1; }
        var _this = _super.call(this, parallelUploads, expectedUploads, UploaderQueue.upload(fileObject)) || this;
        _this.eventEmitter = new stream_1.EventEmitter();
        _this.passthrough = new stream_1.PassThrough();
        _this.shardIndex = 0;
        _this.concurrentUploads = 0;
        _this.concurrency = 0;
        _this.concurrency = parallelUploads;
        _this.passthrough.on('data', _this.handleData.bind(_this));
        _this.passthrough.on('end', _this.end.bind(_this));
        _this.passthrough.on('error', function (err) {
            _this.emit('error', error_1.wrap('Farmer request error', err));
        });
        return _this;
    }
    UploaderQueue.upload = function (fileObject) {
        return function (req) {
            return fileObject.uploadShard(req.content, req.content.length, fileObject.frameId, req.index, 3, false)
                .then(function (shardMeta) {
                fileObject.shardMetas.push(shardMeta);
            })
                .finally(function () {
                if (req.finishCb) {
                    req.finishCb();
                }
            });
        };
    };
    UploaderQueue.prototype.getUpstream = function () {
        return this.passthrough;
    };
    UploaderQueue.prototype.handleData = function (chunk) {
        var _this = this;
        this.concurrentUploads++;
        if (this.concurrentUploads === this.concurrency) {
            this.passthrough.pause();
        }
        var finishCb = function () {
            _this.concurrentUploads--;
            _this.emit('upload-progress', chunk.length);
            if (_this.passthrough.isPaused()) {
                _this.passthrough.resume();
            }
        };
        this.push({ content: chunk, index: this.shardIndex++, finishCb: finishCb });
    };
    UploaderQueue.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.eventEmitter.emit(event, args);
    };
    UploaderQueue.prototype.getListenerCount = function (event) {
        return this.eventEmitter.listenerCount(event);
    };
    UploaderQueue.prototype.getListeners = function (event) {
        return this.eventEmitter.listeners(event);
    };
    UploaderQueue.prototype.on = function (event, listener) {
        this.eventEmitter.on(event, listener);
        return this;
    };
    UploaderQueue.prototype.once = function (event, listener) {
        this.eventEmitter.once(event, listener);
        return this;
    };
    UploaderQueue.prototype.end = function (cb) {
        var _this = this;
        _super.prototype.end.call(this, function () {
            if (cb) {
                cb();
            }
            _this.emit('end');
        });
    };
    return UploaderQueue;
}(concurrentQueue_1.ConcurrentQueue));
exports.UploaderQueue = UploaderQueue;
