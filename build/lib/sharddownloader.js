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
exports.ShardDownloaderStream = void 0;
var stream_1 = require("stream");
var ShardDownloaderStream = /** @class */ (function (_super) {
    __extends(ShardDownloaderStream, _super);
    function ShardDownloaderStream(fileInfo, shardInfo) {
        var _this = _super.call(this) || this;
        _this.fileInfo = fileInfo;
        _this.shardInfo = shardInfo;
        return _this;
    }
    ShardDownloaderStream.prototype.startDownload = function () {
    };
    return ShardDownloaderStream;
}(stream_1.Transform));
exports.ShardDownloaderStream = ShardDownloaderStream;
