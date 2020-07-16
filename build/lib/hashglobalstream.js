"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalHash = void 0;
var crypto_1 = require("./crypto");
var GlobalHash = /** @class */ (function () {
    function GlobalHash(key) {
        this.currentIndex = 0;
        this.HKeys = new Map();
        if (key instanceof String) {
            key = Buffer.from(key);
        }
        this.hasher = crypto_1.sha512HmacBuffer(key);
    }
    GlobalHash.prototype.push = function (index, hash) {
        var _a;
        if (hash) {
            (_a = this.HKeys) === null || _a === void 0 ? void 0 : _a.set(index, hash);
        }
        if (index === this.currentIndex && this.HKeys.has(index)) {
            var hashValue = this.HKeys.get(index);
            if (hashValue) {
                this.hasher.update(hashValue);
                this.HKeys.delete(index);
                this.currentIndex++;
                this.push(this.currentIndex);
            }
        }
    };
    GlobalHash.prototype.digest = function () {
        this.HKeys.clear();
        return this.hasher.digest();
    };
    return GlobalHash;
}());
exports.GlobalHash = GlobalHash;
