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
exports.UploadStrategy = exports.UploadEvents = void 0;
var stream_1 = require("stream");
var UploadEvents;
(function (UploadEvents) {
    UploadEvents["Error"] = "upload-error";
    UploadEvents["Started"] = "upload-start";
    UploadEvents["Progress"] = "upload-progress";
    UploadEvents["Aborted"] = "upload-aborted";
    UploadEvents["Finished"] = "upload-finished";
    UploadEvents["ShardUploadSuccess"] = "shard-upload-success";
})(UploadEvents = exports.UploadEvents || (exports.UploadEvents = {}));
var UploadStrategy = /** @class */ (function (_super) {
    __extends(UploadStrategy, _super);
    function UploadStrategy() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.fileEncryptionKey = Buffer.alloc(0);
        _this.iv = Buffer.alloc(0);
        return _this;
    }
    return UploadStrategy;
}(stream_1.EventEmitter));
exports.UploadStrategy = UploadStrategy;