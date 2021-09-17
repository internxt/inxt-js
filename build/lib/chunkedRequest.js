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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkedRequest = void 0;
var https_1 = require("https");
var events_1 = __importDefault(require("events"));
var stream_1 = require("stream");
var ChunkedRequest = /** @class */ (function (_super) {
    __extends(ChunkedRequest, _super);
    function ChunkedRequest(url) {
        var _this = _super.call(this) || this;
        _this.passthrough = new stream_1.PassThrough();
        _this.response = [];
        var hostname = url.hostname, pathname = url.pathname;
        _this.options = { hostname: hostname, pathname: pathname, method: 'POST', protocol: 'https:' };
        var req = https_1.request(_this.options, function (res) {
            res.on('data', _this.response.push.bind(_this));
            res.once('end', function () { return _this.emit('request-end', _this.response); });
            res.once('error', function (err) {
                res.removeAllListeners();
                _this.emit('err', err);
                _this.destroy();
            });
        });
        _this.stream = _this.passthrough.pipe(req);
        return _this;
    }
    ChunkedRequest.prototype.write = function (b, end, finishCb) {
        if (end === void 0) { end = false; }
        stream_1.Readable.from(b).pipe(this.stream, { end: end })
            .once('error', function (err) { return finishCb(null, err); })
            .once('end', finishCb);
    };
    ChunkedRequest.prototype.end = function (b, cb) {
        var _this = this;
        this.write(b, true, function (res, err) {
            if (err) {
                cb(res, err);
            }
            else {
                cb(Buffer.concat(_this.response));
            }
            _this.destroy();
        });
    };
    ChunkedRequest.prototype.destroy = function () {
        this.removeAllListeners();
    };
    return ChunkedRequest;
}(events_1.default));
exports.ChunkedRequest = ChunkedRequest;
