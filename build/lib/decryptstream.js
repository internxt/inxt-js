"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecryptStream = void 0;
var crypto_1 = require("crypto");
var DecryptStream = /** @class */ (function () {
    function DecryptStream(key, iv) {
        this.currentIndex = 0;
        this.SFiles = new Map();
        this.decipher = crypto_1.createDecipheriv('aes-256-ctr', key, iv);
    }
    return DecryptStream;
}());
exports.DecryptStream = DecryptStream;
exports.default = DecryptStream;
