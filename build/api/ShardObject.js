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
exports.ShardObject = void 0;
var shard_1 = require("./shard");
var hashstream_1 = require("../lib/hashstream");
var reports_1 = require("./reports");
var stream_1 = require("stream");
var events_1 = require("events");
var crypto_1 = require("../lib/crypto");
var ShardObject = /** @class */ (function (_super) {
    __extends(ShardObject, _super);
    function ShardObject(config, shardInfo, bucketId, fileId) {
        var _this = _super.call(this) || this;
        _this.shardHash = null;
        _this.retryCount = 3;
        _this._isFinished = false;
        _this.shardInfo = shardInfo;
        _this.shardData = Buffer.alloc(0);
        _this.config = config;
        _this.bucketId = bucketId;
        _this.fileId = fileId;
        _this.currentPosition = 0;
        _this.hasher = new hashstream_1.HashStream(shardInfo.size);
        _this.exchangeReport = new reports_1.ExchangeReport(config);
        _this.downloadStream = new stream_1.Transform({ transform: function (chunk, enc, cb) { cb(null, chunk); } });
        return _this;
    }
    ShardObject.prototype.StartDownloadShard = function () {
        var _this = this;
        var downloader = shard_1.DownloadShardRequest(this.config, this.shardInfo.farmer.address, this.shardInfo.farmer.port, this.shardInfo.hash, this.shardInfo.token);
        var res = downloader.pipe(this.hasher).pipe(this.downloadStream);
        this.shardData = Buffer.alloc(this.shardInfo.size);
        this.currentPosition = 0;
        this.hasher.on('end', function () {
            _this.shardHash = crypto_1.ripemd160(_this.hasher.read());
            if (_this.shardHash.toString('hex') !== _this.shardInfo.hash) {
                _this.emit('error', new Error('Invalid shard hash'));
            }
        });
        res.on('data', function (data) {
            data.copy(_this.shardData, _this.currentPosition);
            _this.currentPosition += data.length;
            _this.emit('progress', _this.currentPosition, _this.shardInfo.size, _this.currentPosition / _this.shardInfo.size);
        });
        res.on('end', function () { return _this.emit('end'); });
    };
    ShardObject.prototype.isFinished = function () { return this._isFinished; };
    return ShardObject;
}(events_1.EventEmitter));
exports.ShardObject = ShardObject;
