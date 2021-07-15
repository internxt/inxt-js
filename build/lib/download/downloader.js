"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueStream = void 0;
var async_1 = require("async");
var stream_1 = require("stream");
var QueueStream = /** @class */ (function () {
    function QueueStream(downloadsNumber, concurrency) {
        var _this = this;
        if (concurrency === void 0) { concurrency = 1; }
        this.pendingDownloads = [];
        this.downloadsNumber = downloadsNumber;
        this.internalStream = new stream_1.PassThrough();
        this.streamsQueue = async_1.queue(function (stream, next) {
            stream.on('data', function (chunk) {
                _this.internalStream.push(chunk);
            });
            stream.on('error', function (err) {
                _this.internalStream.emit('error', err);
                next(err);
            });
            stream.on('end', function () {
                next();
            });
        }, concurrency);
    }
    QueueStream.prototype.attach = function (download) {
        var _this = this;
        if (download instanceof Array) {
            download.sort(function (a, b) { return a.index - b.index; });
            if (this.downloadsNumber < download[0].index - 1) {
                download.forEach(function (pendingDownload) {
                    _this.pendingDownloads.push(pendingDownload);
                });
                return;
            }
            download.forEach(function (pendingDownload) {
                _this.streamsQueue.push(pendingDownload.content);
            });
            this.downloadsNumber += download.length;
        }
        else {
            this.streamsQueue.push(download.content);
            this.downloadsNumber += 1;
        }
    };
    QueueStream.prototype.getContent = function () {
        return this.internalStream;
    };
    QueueStream.prototype.end = function () {
        this.internalStream.end();
    };
    return QueueStream;
}());
exports.QueueStream = QueueStream;
