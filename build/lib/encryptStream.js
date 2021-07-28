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
exports.EncryptStream = void 0;
var stream_1 = require("stream");
var crypto_1 = require("crypto");
var EncryptStream = /** @class */ (function (_super) {
    __extends(EncryptStream, _super);
    function EncryptStream(key, iv) {
        var _this = _super.call(this) || this;
        _this.shards = [];
        _this.indexCounter = 0;
        _this.cipher = crypto_1.createCipheriv('aes-256-ctr', key, iv);
        return _this;
    }
    EncryptStream.prototype._transform = function (chunk, enc, cb) {
        this.cipher.write(chunk);
        this.shards.push({ size: chunk.byteLength, index: this.indexCounter });
        this.indexCounter++;
        cb(null, this.cipher.read());
    };
    EncryptStream.prototype._flush = function (cb) {
        cb(null, this.cipher.read());
    };
    return EncryptStream;
}(stream_1.Transform));
exports.EncryptStream = EncryptStream;
exports.default = EncryptStream;
