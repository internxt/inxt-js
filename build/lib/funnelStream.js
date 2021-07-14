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
exports.FunnelStream = void 0;
var stream_1 = require("stream");
var FunnelStream = /** @class */ (function (_super) {
    __extends(FunnelStream, _super);
    function FunnelStream(limit) {
        if (limit === void 0) { limit = 1; }
        var _this = _super.call(this) || this;
        _this.bufferOffset = 0;
        _this.lastChunkLength = 0;
        _this.bytesCounter = 0;
        _this.limit = limit;
        _this.buffer = Buffer.alloc(limit);
        return _this;
    }
    FunnelStream.prototype.bufferStillHasData = function () {
        return this.bufferOffset != 0;
    };
    FunnelStream.prototype.bufferIsEmpty = function () {
        return this.bufferOffset === 0;
    };
    FunnelStream.prototype.pushToReadable = function (b) {
        this.bytesCounter += b.length;
        this.push(b);
    };
    FunnelStream.prototype.pushBuffer = function () {
        this.pushToReadable(this.buffer);
    };
    FunnelStream.prototype._transform = function (chunk, enc, done) {
        // console.log('chunk length', chunk.length);
        var _this = this;
        if (this.bufferStillHasData()) {
            var bytesToPush_1 = (this.limit - this.bufferOffset);
            var enoughToFillBuffer = function () { return chunk.length >= bytesToPush_1; };
            var completeBuffer = function () { return chunk.copy(_this.buffer, _this.bufferOffset, 0, bytesToPush_1); };
            var addToBuffer = function () { return chunk.copy(_this.buffer, _this.bufferOffset); };
            var resetOffset = function () { return _this.bufferOffset = 0; };
            var incrementOffset = function (increment) { return _this.bufferOffset += increment; };
            if (enoughToFillBuffer()) {
                completeBuffer();
                this.pushBuffer();
                resetOffset();
                chunk = chunk.slice(bytesToPush_1, chunk.length);
            }
            else {
                addToBuffer();
                incrementOffset(chunk.length);
            }
        }
        var pushChunks = function (chunk) {
            var offset = 0;
            var chunkSize = chunk.length;
            var notIteratedEntireBuffer = function () { return chunkSize >= _this.limit; };
            while (notIteratedEntireBuffer()) {
                _this.pushToReadable(chunk.slice(offset, offset + _this.limit));
                offset += _this.limit;
                chunkSize -= _this.limit;
            }
            return chunk.slice(offset, offset + chunkSize);
        };
        if (this.bufferIsEmpty()) {
            var remainingChunk = pushChunks(chunk);
            if (remainingChunk.length) {
                // save remaining chunk for the next event
                remainingChunk.copy(this.buffer);
                this.lastChunkLength = remainingChunk.byteLength;
                this.bufferOffset += remainingChunk.length;
            }
        }
        done(null);
    };
    FunnelStream.prototype._flush = function (done) {
        if (this.bufferStillHasData()) {
            this.pushToReadable(this.buffer.slice(0, this.bufferOffset));
        }
        done();
    };
    return FunnelStream;
}(stream_1.Transform));
exports.FunnelStream = FunnelStream;
