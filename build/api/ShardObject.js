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
var events_1 = require("events");
var ShardObject = /** @class */ (function (_super) {
    __extends(ShardObject, _super);
    function ShardObject(config, shardInfo, bucketId, fileId) {
        var _this = _super.call(this) || this;
        _this.shardHash = null;
        _this.retryCount = 3;
        _this._isFinished = false;
        _this._isErrored = false;
        _this.shardInfo = shardInfo;
        _this.config = config;
        _this.bucketId = bucketId;
        _this.fileId = fileId;
        _this.hasher = new hashstream_1.HashStream(shardInfo.size);
        _this.exchangeReport = new reports_1.ExchangeReport(config);
        return _this;
    }
    ShardObject.prototype.StartDownloadShard = function () {
        return shard_1.DownloadShardRequest(this.config, this.shardInfo.farmer.address, this.shardInfo.farmer.port, this.shardInfo.hash, this.shardInfo.token, this.shardInfo.farmer.nodeID);
    };
    ShardObject.prototype.isFinished = function () { return this._isFinished; };
    return ShardObject;
}(events_1.EventEmitter));
exports.ShardObject = ShardObject;
