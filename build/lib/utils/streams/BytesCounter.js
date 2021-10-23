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
exports.BytesCounter = void 0;
var stream_1 = require("stream");
var BytesCounter = /** @class */ (function (_super) {
    __extends(BytesCounter, _super);
    function BytesCounter(opts) {
        var _this = _super.call(this, opts) || this;
        _this.bytesCount = 0;
        return _this;
    }
    Object.defineProperty(BytesCounter.prototype, "count", {
        get: function () {
            return this.bytesCount;
        },
        enumerable: false,
        configurable: true
    });
    BytesCounter.prototype._transform = function (chunk, enc, cb) {
        this.bytesCount += chunk.length;
        cb(null, chunk);
    };
    BytesCounter.prototype._flush = function (cb) {
        cb(null);
    };
    return BytesCounter;
}(stream_1.Transform));
exports.BytesCounter = BytesCounter;
