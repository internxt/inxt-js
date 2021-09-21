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
exports.ProgressNotifier = exports.Events = void 0;
var stream_1 = require("stream");
var Events;
(function (Events) {
    Events["Progress"] = "progress";
})(Events = exports.Events || (exports.Events = {}));
var ProgressNotifier = /** @class */ (function (_super) {
    __extends(ProgressNotifier, _super);
    function ProgressNotifier(totalBytes, interval, opts) {
        var _this = _super.call(this, opts) || this;
        _this.readBytes = 0;
        _this.progressInterval = setInterval(function () {
            if (_this.readBytes > 0) {
                _this.emit(Events.Progress, _this.readBytes / totalBytes);
            }
        }, interval !== null && interval !== void 0 ? interval : 10);
        return _this;
    }
    ProgressNotifier.prototype._transform = function (chunk, enc, cb) {
        this.readBytes += chunk.length;
        cb(null, chunk);
    };
    ProgressNotifier.prototype._flush = function (cb) {
        clearInterval(this.progressInterval);
        cb(null);
    };
    return ProgressNotifier;
}(stream_1.Transform));
exports.ProgressNotifier = ProgressNotifier;
