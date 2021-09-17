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
exports.Tap = exports.TapEvents = void 0;
var stream_1 = require("stream");
var TapEvents;
(function (TapEvents) {
    TapEvents["Opened"] = "tap-opened";
    TapEvents["Closed"] = "tap-closed";
})(TapEvents = exports.TapEvents || (exports.TapEvents = {}));
// preconditions: 
// diameterSize >= chunk size on each transform
var Tap = /** @class */ (function (_super) {
    __extends(Tap, _super);
    function Tap(diameterSize, options) {
        var _this = _super.call(this, options) || this;
        _this.bytesRead = 0;
        _this.temporalBuffer = Buffer.alloc(0);
        _this.pausedInterval = setTimeout(function () { });
        _this.shouldContinue = false;
        _this.diameterSize = diameterSize;
        return _this;
    }
    Tap.prototype._transform = function (chunk, enc, done) {
        if (chunk.length > this.diameterSize) {
            done(new Error('TapStreamError: Chunk length is bigger than diameter size'));
            return;
        }
        // console.log('diameterSize: %s, bytesRead: %s, incoming chunkSize: %s', this.diameterSize, this.bytesRead, chunk.length);
        if (this.temporalBuffer.length > 0) {
            var diffToRefill = this.diameterSize - this.temporalBuffer.length;
            this.pump(Buffer.concat([this.temporalBuffer, chunk.slice(0, diffToRefill)]));
            this.bytesRead = 0;
            this.temporalBuffer = Buffer.alloc(0);
            chunk = chunk.slice(diffToRefill);
        }
        if (chunk.length > this.diameterSize - this.bytesRead) {
            // console.log('chunk cannot be pushed at all');
            if (this.diameterSize - this.bytesRead >= 0) { // bug here, if this.diameterSize - this.bytesRead == 0, what to do?
                // console.log('pushing from byte 0 to byte %s', this.diameterSize - this.bytesRead - 1);
                // console.log('bytes %s', this.diameterSize - this.bytesRead);
                // console.log('saving from byte %s to byte %s', this.diameterSize - this.bytesRead, chunk.length);
                this.temporalBuffer = chunk.slice(this.diameterSize - this.bytesRead);
                this.pump(chunk.slice(0, this.diameterSize - this.bytesRead));
            }
            this.close(done);
        }
        else {
            this.pump(chunk);
            done(null);
        }
    };
    Tap.prototype.pump = function (b) {
        this.bytesRead += b.length;
        this.push(b);
    };
    Tap.prototype.open = function () {
        this.emit(TapEvents.Opened);
        console.log('opening tap');
        this.shouldContinue = true;
    };
    Tap.prototype.close = function (cb) {
        var _this = this;
        this.emit(TapEvents.Closed);
        console.log('closing tap');
        this.pausedInterval = setInterval(function () {
            if (_this.shouldContinue) {
                cb(null);
                clearInterval(_this.pausedInterval);
                _this.shouldContinue = false;
            }
        }, 50);
    };
    Tap.prototype._flush = function (done) {
        if (this.temporalBuffer.length > 0) {
            this.pump(this.temporalBuffer);
        }
        done();
    };
    return Tap;
}(stream_1.Transform));
exports.Tap = Tap;
