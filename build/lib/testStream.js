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
exports.TestStream = void 0;
var stream_1 = require("stream");
var TestStream = /** @class */ (function (_super) {
    __extends(TestStream, _super);
    function TestStream(totalSize) {
        var _this = _super.call(this, { highWaterMark: 17000, readableHighWaterMark: 17000, writableHighWaterMark: 17000 }) || this;
        _this.totalBytes = 0;
        _this.offset = 0;
        _this.totalSize = totalSize;
        _this.startPosition = 0;
        _this.endPosition = 100;
        return _this;
    }
    TestStream.prototype._pushChunk = function (chunk, cb) {
        var _this = this;
        var wait = false;
        for (var i = 0; i < chunk.length; i += 100) {
            if (this.push(this.takeSliceOf(chunk, 100)) === false) {
                // buffer full
                this.pause();
                wait = true;
                this.once('drain', function () {
                    // buffer ready to continue
                    // retry last push
                    _this.startPosition -= 100;
                    wait = false;
                });
                console.log("stopped in " + this.startPosition + " bytes");
                console.log('waiting until buffer emits drain');
                while (wait) { }
                console.log('continuing');
            }
        }
    };
    TestStream.prototype._transform = function (chunk, enc, cb) {
        console.log(chunk.length);
        this._pushChunk(chunk, cb);
    };
    TestStream.prototype.takeSliceOf = function (chunk, sliceSize) {
        var slicedBuffer = chunk.slice(this.startPosition, this.startPosition + sliceSize);
        this.startPosition += sliceSize;
        return slicedBuffer;
    };
    TestStream.prototype._flush = function (cb) {
        cb(null);
    };
    return TestStream;
}(stream_1.Transform));
exports.TestStream = TestStream;
exports.default = TestStream;
