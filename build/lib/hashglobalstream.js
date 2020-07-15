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
        var _a, _b;
        if (hash) {
            (_a = this.HKeys) === null || _a === void 0 ? void 0 : _a.set(index, hash);
        }
        if (index === this.currentIndex && ((_b = this.HKeys) === null || _b === void 0 ? void 0 : _b.has(index))) {
            this.hasher.update(this.HKeys.get(index));
            this.HKeys.delete(index);
            this.currentIndex++;
            this.push(this.currentIndex);
        }
    };
    GlobalHash.prototype.digest = function () {
        var _a;
        (_a = this.HKeys) === null || _a === void 0 ? void 0 : _a.clear();
        this.HKeys = null;
        return this.hasher.digest();
    };
    return GlobalHash;
}());
exports.GlobalHash = GlobalHash;
