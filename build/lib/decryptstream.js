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
var stream_1 = require("stream");
var crypto_1 = require("crypto");
/**
 * Creates a new stream to decrypt one file
 */
var DecryptStream = /** @class */ (function (_super) {
    __extends(DecryptStream, _super);
    function DecryptStream(key, iv) {
        var _this = _super.call(this) || this;
        _this.totalBytesDecrypted = 0;
        _this._transform = function (chunk, enc, callback) {
            _this.decipher.write(chunk);
            _this.totalBytesDecrypted += chunk.length;
            _this.emit('decrypted-bytes', _this.totalBytesDecrypted);
            callback(null, _this.decipher.read());
        };
        _this._flush = function (callback) {
            _this.emit('end');
            callback(null, _this.decipher.read());
        };
        _this.decipher = crypto_1.createDecipheriv('aes-256-ctr', key, iv);
        return _this;
    }
    return DecryptStream;
}(stream_1.Transform));
exports.DecryptStream = DecryptStream;
exports.default = DecryptStream;
