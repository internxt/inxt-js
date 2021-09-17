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
exports.UploaderQueueV2 = exports.Events = void 0;
var stream_1 = require("stream");
var events_1 = require("events");
var concurrentQueue_1 = require("../concurrentQueue");
var Events;
(function (Events) {
    Events["Error"] = "uploader-queue-error";
    Events["Progress"] = "uploader-queue-progress";
    Events["End"] = "uploader-queue-end";
})(Events = exports.Events || (exports.Events = {}));
var UploaderQueueV2 = /** @class */ (function (_super) {
    __extends(UploaderQueueV2, _super);
    function UploaderQueueV2(parallelUploads, expectedUploads, task) {
        if (parallelUploads === void 0) { parallelUploads = 1; }
        if (expectedUploads === void 0) { expectedUploads = 1; }
        var _this = _super.call(this, parallelUploads, expectedUploads, task) || this;
        _this.eventEmitter = new events_1.EventEmitter();
        _this.passthrough = new stream_1.PassThrough();
        _this.shardIndex = 0;
        _this.concurrentUploads = 0;
        _this.concurrency = 0;
        _this.concurrency = parallelUploads;
        _this.passthrough.on('data', _this.handleData.bind(_this));
        _this.passthrough.on('end', _this.end.bind(_this));
        _this.passthrough.on('error', function (err) { return _this.emit(Events.Error, err); });
        return _this;
    }
    UploaderQueueV2.prototype.getUpstream = function () {
        return this.passthrough;
    };
    UploaderQueueV2.prototype.handleData = function (chunk) {
        var _this = this;
        this.concurrentUploads++;
        if (this.concurrentUploads === this.concurrency) {
            this.passthrough.pause();
        }
        var currentShardIndex = this.shardIndex;
        var finishCb = function () {
            _this.concurrentUploads--;
            _this.emit(Events.Progress, currentShardIndex);
            if (_this.passthrough.isPaused()) {
                _this.passthrough.resume();
            }
        };
        this.push({ shardIndex: this.shardIndex, stream: stream_1.Readable.from(chunk), finishCb: finishCb });
        this.shardIndex++;
    };
    UploaderQueueV2.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.eventEmitter.emit(event, args);
    };
    UploaderQueueV2.prototype.getListenerCount = function (event) {
        return this.eventEmitter.listenerCount(event);
    };
    UploaderQueueV2.prototype.getListeners = function (event) {
        return this.eventEmitter.listeners(event);
    };
    UploaderQueueV2.prototype.on = function (event, listener) {
        this.eventEmitter.on(event, listener);
        return this;
    };
    UploaderQueueV2.prototype.once = function (event, listener) {
        this.eventEmitter.once(event, listener);
        return this;
    };
    UploaderQueueV2.prototype.removeAllListeners = function () {
        this.eventEmitter.removeAllListeners();
    };
    UploaderQueueV2.prototype.end = function (cb) {
        var _this = this;
        _super.prototype.end.call(this, function () {
            if (cb) {
                cb();
            }
            _this.emit(Events.End);
        });
    };
    UploaderQueueV2.prototype.destroy = function () {
        this.removeAllListeners();
    };
    UploaderQueueV2.prototype.abort = function () {
        this.destroy();
        this.passthrough.destroy();
        this.queue.kill();
    };
    return UploaderQueueV2;
}(concurrentQueue_1.ConcurrentQueue));
exports.UploaderQueueV2 = UploaderQueueV2;
