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
var stream_1 = require("stream");
var CutterStream = /** @class */ (function (_super) {
    __extends(CutterStream, _super);
    function CutterStream(until) {
        var _this = _super.call(this) || this;
        _this.until = until;
        return _this;
    }
    CutterStream.prototype.transform = function (chunk, enc, cb) {
        if (chunk.length > this.until) {
            cb(null, chunk.slice(0, this.until));
        }
        else {
            this.until -= chunk.length;
            cb(null, chunk);
        }
    };
    return CutterStream;
}(stream_1.Transform));
exports.default = CutterStream;
