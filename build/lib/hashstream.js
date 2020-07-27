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
exports.HashStream = void 0;
var stream_1 = require("stream");
var crypto_1 = require("./crypto");
var HashStream = /** @class */ (function (_super) {
    __extends(HashStream, _super);
    function HashStream(expectedSize) {
        var _this = _super.call(this) || this;
        _this.flushed = false;
        _this.expectedSize = 1;
        _this.hasher = crypto_1.sha256HashBuffer();
        _this.length = 0;
        _this.finalHash = Buffer.alloc(0);
        _this.expectedSize = expectedSize || 1;
        return _this;
    }
    HashStream.prototype._transform = function (chunk, enc, callback) {
        this.hasher.update(chunk);
        this.length += chunk.length;
        this.emit('progress', this.length * 100 / this.expectedSize);
        callback(null, chunk);
    };
    HashStream.prototype._flush = function () {
        this.hasher.end();
        this.emit('end');
    };
    HashStream.prototype.read = function () { return this.finalHash = this.hasher.read(); };
    return HashStream;
}(stream_1.Transform));
exports.HashStream = HashStream;
