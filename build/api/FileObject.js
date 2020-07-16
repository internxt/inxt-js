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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileObject = void 0;
var ShardObject_1 = require("./ShardObject");
var fileinfo_1 = require("./fileinfo");
var events_1 = require("events");
var crypto_1 = require("../lib/crypto");
var async_1 = require("async");
var FileObject = /** @class */ (function (_super) {
    __extends(FileObject, _super);
    function FileObject(config, bucketId, fileId) {
        var _this = _super.call(this) || this;
        _this.shards = new Map();
        _this.rawShards = new Map();
        _this.config = config;
        _this.bucketId = bucketId;
        _this.fileId = fileId;
        _this.fileKey = Buffer.alloc(0);
        return _this;
    }
    FileObject.prototype.GetFileInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!!this.fileInfo) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileInfo(this.config, this.bucketId, this.fileId)];
                    case 1:
                        _a.fileInfo = _c.sent();
                        if (!this.config.encryptionKey) return [3 /*break*/, 3];
                        _b = this;
                        return [4 /*yield*/, crypto_1.GenerateFileKey(this.config.encryptionKey, this.bucketId, Buffer.from(this.fileInfo.index, 'hex'))];
                    case 2:
                        _b.fileKey = _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/, this.fileInfo];
                }
            });
        });
    };
    FileObject.prototype.GetFileMirrors = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileMirrors(this.config, this.bucketId, this.fileId)];
                    case 1:
                        _a.rawShards = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileObject.prototype.StartDownloadFile = function () {
        return __awaiter(this, void 0, void 0, function () {
            var shardObject;
            var _this = this;
            return __generator(this, function (_a) {
                if (this.fileInfo === null) {
                    return [2 /*return*/];
                }
                return [2 /*return*/, async_1.eachLimit(this.rawShards.keys(), 4, function (shardIndex, nextItem) {
                        var shard = _this.rawShards.get(shardIndex);
                        if (_this.fileInfo && shard) {
                            shardObject = new ShardObject_1.ShardObject(_this.config, shard, _this.bucketId, _this.fileId);
                            _this.shards.set(shardIndex, shardObject);
                            shardObject.on('progress', function () { _this.updateGlobalPercentage(); });
                            shardObject.on('error', function (err) { console.log('SHARD ERROR', err.message); });
                            shardObject.StartDownloadShard();
                        }
                        return nextItem();
                    }, function () {
                        console.log('ALL SHARDS DOWNLOADING');
                    })];
            });
        });
    };
    FileObject.prototype.updateGlobalPercentage = function () {
        var _this = this;
        var _a;
        var result = { totalBytesDownloaded: 0, totalSize: (_a = this.fileInfo) === null || _a === void 0 ? void 0 : _a.size };
        async_1.eachSeries(this.shards.values(), function (shard, nextShard) {
            if (!shard.shardInfo.parity) {
                result.totalBytesDownloaded += shard.currentPosition;
            }
            nextShard();
        }, function () {
            _this.emit('progress', result);
        });
    };
    return FileObject;
}(events_1.EventEmitter));
exports.FileObject = FileObject;
