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
exports.DecryptStream = void 0;
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var crypto_2 = require("./crypto");
var events_1 = require("./events");
var DecryptStream = /** @class */ (function (_super) {
    __extends(DecryptStream, _super);
    function DecryptStream(key, iv) {
        var _this = _super.call(this) || this;
        _this.decipher = crypto_1.createDecipheriv('aes-256-ctr', key, iv);
        return _this;
    }
    DecryptStream.prototype._transform = function (chunk, enc, cb) {
        console.log('DECRYPTER: Received chunk of %s, hash %s', chunk.length, crypto_2.ripemd160(crypto_2.sha256(chunk)).toString('hex'));
        this.decipher.write(chunk);
        this.emit(events_1.DECRYPT.PROGRESS, chunk.byteLength);
        cb(null, this.decipher.read());
    };
    DecryptStream.prototype._flush = function (cb) {
        cb(null, this.decipher.read());
    };
    return DecryptStream;
}(stream_1.Transform));
exports.DecryptStream = DecryptStream;
exports.default = DecryptStream;
