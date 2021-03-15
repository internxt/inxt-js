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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileObject = void 0;
var ShardObject_1 = require("./ShardObject");
var fileinfo_1 = require("./fileinfo");
var events_1 = require("events");
var crypto_1 = require("../lib/crypto");
var async_1 = require("async");
var decryptstream_1 = __importDefault(require("../lib/decryptstream"));
var crypto_2 = require("crypto");
var filemuxer_1 = __importDefault(require("../lib/filemuxer"));
var stream_1 = require("stream");
function BufferToStream(buffer) {
    var stream = new stream_1.Duplex();
    stream.push(buffer);
    stream.push(null);
    return stream;
}
var FileObject = /** @class */ (function (_super) {
    __extends(FileObject, _super);
    function FileObject(config, bucketId, fileId) {
        var _this = _super.call(this) || this;
        _this.shards = [];
        _this.rawShards = [];
        _this.length = -1;
        _this.final_length = -1;
        _this.totalSizeWithECs = 0;
        _this.config = config;
        _this.bucketId = bucketId;
        _this.fileId = fileId;
        _this.fileKey = Buffer.alloc(0);
        _this.decipher = new decryptstream_1.default(crypto_2.randomBytes(32), crypto_2.randomBytes(16));
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
                        return [4 /*yield*/, fileinfo_1.GetFileMirrors(this.config, this.bucketId, this.fileId)
                            // Sanitize address
                        ];
                    case 1:
                        _a.rawShards = _b.sent();
                        // Sanitize address
                        this.rawShards.map(function (shard) {
                            shard.farmer.address = shard.farmer.address.trim();
                        });
                        this.length = this.rawShards.reduce(function (a, b) { return { size: a.size + b.size }; }, { size: 0 }).size;
                        this.final_length = this.rawShards.filter(function (x) { return x.parity === false; }).reduce(function (a, b) { return { size: a.size + b.size }; }, { size: 0 }).size;
                        return [2 /*return*/];
                }
            });
        });
    };
    FileObject.prototype.StartDownloadShard = function (index) {
        return __awaiter(this, void 0, void 0, function () {
            var shardIndex, shard, fileMuxer, shardObject, buffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.fileInfo) {
                            throw new Error('Undefined fileInfo');
                        }
                        shardIndex = this.rawShards.map(function (x) { return x.index; }).indexOf(index);
                        shard = this.rawShards[shardIndex];
                        fileMuxer = new filemuxer_1.default({ shards: 1, length: shard.size });
                        shardObject = new ShardObject_1.ShardObject(this.config, shard, this.bucketId, this.fileId);
                        return [4 /*yield*/, shardObject.StartDownloadShard()];
                    case 1:
                        buffer = _a.sent();
                        fileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null);
                        return [2 /*return*/, fileMuxer];
                }
            });
        });
    };
    FileObject.prototype.TryDownloadShardWithFileMuxer = function (shard, excluded) {
        if (excluded === void 0) { excluded = []; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var _a;
                        async_1.retry({ times: ((_a = _this.config.config) === null || _a === void 0 ? void 0 : _a.shardRetry) || 3, interval: 1000 }, function (nextTry) { return __awaiter(_this, void 0, void 0, function () {
                            var downloadHasError, downloadError, oneFileMuxer, shardObject, buffs, buffer;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        downloadHasError = false;
                                        downloadError = null;
                                        oneFileMuxer = new filemuxer_1.default({ shards: 1, length: shard.size });
                                        shardObject = new ShardObject_1.ShardObject(this.config, shard, this.bucketId, this.fileId);
                                        oneFileMuxer.on('error', function (err) {
                                            downloadHasError = true;
                                            downloadError = err;
                                            // Should emit Exchange Report?
                                        });
                                        buffs = [];
                                        oneFileMuxer.on('data', function (data) { buffs.push(data); });
                                        oneFileMuxer.once('drain', function () {
                                            if (downloadHasError) {
                                                nextTry(downloadError);
                                            }
                                            else {
                                                nextTry(null, Buffer.concat(buffs));
                                            }
                                        });
                                        return [4 /*yield*/, shardObject.StartDownloadShard()];
                                    case 1:
                                        buffer = _a.sent();
                                        oneFileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null);
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function (err, result) { return __awaiter(_this, void 0, void 0, function () {
                            var newShard;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!err) return [3 /*break*/, 2];
                                        excluded.push(shard.farmer.nodeID);
                                        return [4 /*yield*/, fileinfo_1.GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded)];
                                    case 1:
                                        newShard = _a.sent();
                                        if (!newShard[0].farmer) {
                                            reject(Error('File missing shard error'));
                                        }
                                        else {
                                            return [2 /*return*/, this.TryDownloadShardWithFileMuxer(newShard[0], excluded)];
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        resolve(result);
                                        _a.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                    })];
            });
        });
    };
    FileObject.prototype.StartDownloadFile = function (cb) {
        var _this = this;
        var shardObject;
        var downloadedBytes = 0;
        var progress = 0;
        var totalBytes = this.fileInfo ? this.fileInfo.size : 0;
        if (!this.fileInfo) {
            throw new Error('Undefined fileInfo');
        }
        this.decipher = new decryptstream_1.default(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16));
        var fileMuxer = new filemuxer_1.default({
            shards: this.rawShards.length,
            length: this.rawShards.reduce(function (a, b) { return { size: a.size + b.size }; }, { size: 0 }).size
        });
        async_1.eachLimit(this.rawShards, 1, function (shard, nextItem) { return __awaiter(_this, void 0, void 0, function () {
            var shardBuffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.fileInfo && shard)) return [3 /*break*/, 2];
                        shardObject = new ShardObject_1.ShardObject(this.config, shard, this.bucketId, this.fileId);
                        this.shards.push(shardObject);
                        return [4 /*yield*/, this.TryDownloadShardWithFileMuxer(shard)];
                    case 1:
                        shardBuffer = _a.sent();
                        fileMuxer.addInputSource(BufferToStream(shardBuffer), shard.size, Buffer.from(shard.hash, 'hex'), null);
                        downloadedBytes += shardBuffer.length;
                        progress = (downloadedBytes / totalBytes) * 100;
                        cb(progress, downloadedBytes, totalBytes);
                        // fileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)
                        fileMuxer.once('drain', function () { return nextItem(); });
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); }, function () {
            _this.shards.forEach(function (shard) { _this.totalSizeWithECs += shard.shardInfo.size; });
            console.log('ALL SHARDS FINISHED');
            _this.emit('end');
        });
        return fileMuxer;
    };
    return FileObject;
}(events_1.EventEmitter));
exports.FileObject = FileObject;
