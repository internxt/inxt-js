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
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var HashStream = /** @class */ (function (_super) {
    __extends(HashStream, _super);
    function HashStream(opts) {
        var _this = _super.call(this, opts) || this;
        _this.hasher = crypto_1.createHash('sha256');
        _this.finalHash = Buffer.alloc(0);
        return _this;
    }
    HashStream.prototype._transform = function (chunk, enc, cb) {
        this.hasher.update(chunk);
        cb(null, chunk);
    };
    HashStream.prototype._flush = function (cb) {
        return this.hasher.end(cb);
    };
    HashStream.prototype.readHash = function () {
        if (!this.finalHash.length) {
            this.finalHash = this.hasher.read();
        }
        return this.finalHash;
    };
    HashStream.prototype.getHash = function () {
        if (!this.finalHash.length) {
            this.readHash();
        }
        return crypto_1.createHash('ripemd160').update(this.finalHash).digest();
    };
    return HashStream;
}(stream_1.Transform));
exports.HashStream = HashStream;
