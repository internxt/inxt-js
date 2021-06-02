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
var crypto_1 = require("crypto");
var events_1 = require("events");
var async_1 = require("async");
var decryptstream_1 = __importDefault(require("../lib/decryptstream"));
var filemuxer_1 = __importDefault(require("../lib/filemuxer"));
var crypto_2 = require("../lib/crypto");
var ShardObject_1 = require("./ShardObject");
var fileinfo_1 = require("./fileinfo");
var reports_1 = require("./reports");
var events_2 = require("../lib/events");
var rs_wrapper_1 = require("rs-wrapper");
var logger_1 = require("../lib/utils/logger");
var buffer_1 = require("../lib/utils/buffer");
var constants_1 = require("./constants");
var MultiStream = require('multistream');
var FileObject = /** @class */ (function (_super) {
    __extends(FileObject, _super);
    function FileObject(config, bucketId, fileId) {
        var _this = _super.call(this) || this;
        _this.shards = [];
        _this.rawShards = [];
        _this.length = -1;
        _this.final_length = -1;
        _this.totalSizeWithECs = 0;
        _this.stopped = false;
        _this.config = config;
        _this.bucketId = bucketId;
        _this.fileId = fileId;
        _this.fileKey = Buffer.alloc(0);
        _this.decipher = new decryptstream_1.default(crypto_1.randomBytes(32), crypto_1.randomBytes(16));
        return _this;
    }
    FileObject.prototype.GetFileInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        logger_1.logger.info('Retrieving file info...');
                        if (!!this.fileInfo) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileInfo(this.config, this.bucketId, this.fileId)];
                    case 1:
                        _a.fileInfo = _c.sent();
                        if (!this.config.encryptionKey) return [3 /*break*/, 3];
                        _b = this;
                        return [4 /*yield*/, crypto_2.GenerateFileKey(this.config.encryptionKey, this.bucketId, Buffer.from(this.fileInfo.index, 'hex'))];
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
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        logger_1.logger.info('Retrieving file mirrors...');
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileMirrors(this.config, this.bucketId, this.fileId)];
                    case 1:
                        _a.rawShards = _b.sent();
                        return [4 /*yield*/, async_1.eachLimit(this.rawShards, 1, function (shard, nextShard) {
                                var attempts = 0;
                                if (!shard.farmer || !shard.farmer.nodeID || !shard.farmer.port || !shard.farmer.address) {
                                    logger_1.logger.warn('Pointer for shard %s failed, retrieving a new one', shard.index);
                                    // try download from 10 mirrors
                                    async_1.doUntil(function (next) {
                                        fileinfo_1.ReplacePointer(_this.config, _this.bucketId, _this.fileId, shard.index, []).then(function (newShard) {
                                            next(null, newShard[0]);
                                        }).catch(function (err) {
                                            next(err, null);
                                        }).finally(function () {
                                            attempts++;
                                        });
                                    }, function (result, next) {
                                        var validPointer = result && result.farmer && result.farmer.nodeID && result.farmer.port && result.farmer.address;
                                        return next(null, validPointer || attempts >= constants_1.DEFAULT_INXT_MIRRORS);
                                    }).then(function (result) {
                                        logger_1.logger.info('Pointer replaced for shard %s', shard.index);
                                        result.farmer.address = result.farmer.address.trim();
                                        _this.rawShards[shard.index] = result;
                                    }).catch(function () {
                                        logger_1.logger.error('Pointer not found for shard %s, marking it as unhealthy', shard.index);
                                        shard.healthy = false;
                                    }).finally(function () {
                                        nextShard(null);
                                    });
                                }
                                else {
                                    shard.farmer.address = shard.farmer.address.trim();
                                    nextShard(null);
                                }
                            })];
                    case 2:
                        _b.sent();
                        this.length = this.rawShards.reduce(function (a, b) { return { size: a.size + b.size }; }, { size: 0 }).size;
                        this.final_length = this.rawShards.filter(function (x) { return x.parity === false; }).reduce(function (a, b) { return { size: a.size + b.size }; }, { size: 0 }).size;
                        return [2 /*return*/];
                }
            });
        });
    };
    FileObject.prototype.StartDownloadShard = function (index) {
        if (!this.fileInfo) {
            throw new Error('Undefined fileInfo');
        }
        var shardIndex = this.rawShards.map(function (x) { return x.index; }).indexOf(index);
        var shard = this.rawShards[shardIndex];
        var fileMuxer = new filemuxer_1.default({ shards: 1, length: shard.size });
        var shardObject = new ShardObject_1.ShardObject(this.config, shard, this.bucketId, this.fileId);
        shardObject.StartDownloadShard().then(function (reqStream) {
            fileMuxer.addInputSource(reqStream, shard.size, Buffer.from(shard.hash, 'hex'), null);
        });
        return fileMuxer;
    };
    FileObject.prototype.TryDownloadShardWithFileMuxer = function (shard, excluded) {
        var _this = this;
        if (excluded === void 0) { excluded = []; }
        var exchangeReport = new reports_1.ExchangeReport(this.config);
        return new Promise(function (resolve, reject) {
            var _a;
            async_1.retry({ times: ((_a = _this.config.config) === null || _a === void 0 ? void 0 : _a.shardRetry) || 3, interval: 1000 }, function (nextTry) { return __awaiter(_this, void 0, void 0, function () {
                var downloadHasError, downloadError, oneFileMuxer, shardObject, buffs, downloaderStream;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            exchangeReport.params.exchangeStart = new Date();
                            exchangeReport.params.farmerId = shard.farmer.nodeID;
                            exchangeReport.params.dataHash = shard.hash;
                            downloadHasError = false;
                            downloadError = null;
                            oneFileMuxer = new filemuxer_1.default({ shards: 1, length: shard.size });
                            shardObject = new ShardObject_1.ShardObject(this.config, shard, this.bucketId, this.fileId);
                            buffs = [];
                            this.on(constants_1.DOWNLOAD_CANCELLED, function () {
                                buffs = [];
                                console.log('Trying to destroy shard downloader');
                                if (downloaderStream) {
                                    console.log('Destroying shard downloader');
                                    downloaderStream.destroy();
                                }
                                nextTry(null, Buffer.alloc(0));
                            });
                            oneFileMuxer.on(events_2.FILEMUXER.PROGRESS, function (msg) { return _this.emit(events_2.FILEMUXER.PROGRESS, msg); });
                            oneFileMuxer.on('error', function (err) {
                                // if (err.message === DOWNLOAD_CANCELLED_ERROR) {
                                //   return;
                                // }
                                downloadHasError = true;
                                downloadError = err;
                                _this.emit(events_2.FILEMUXER.ERROR, err);
                                exchangeReport.DownloadError();
                                // exchangeReport.sendReport().catch(() => null);
                                oneFileMuxer.emit('drain');
                            });
                            oneFileMuxer.on('data', function (data) { buffs.push(data); });
                            oneFileMuxer.once('drain', function () {
                                logger_1.logger.info('Drain received for shard %s', shard.index);
                                if (downloadHasError) {
                                    nextTry(downloadError);
                                }
                                else {
                                    exchangeReport.DownloadOk();
                                    exchangeReport.sendReport().catch(function () { return null; });
                                    nextTry(null, Buffer.concat(buffs));
                                }
                            });
                            return [4 /*yield*/, shardObject.StartDownloadShard()];
                        case 1:
                            downloaderStream = _a.sent();
                            oneFileMuxer.addInputSource(downloaderStream, shard.size, Buffer.from(shard.hash, 'hex'), null);
                            return [2 /*return*/];
                    }
                });
            }); }, function (err, result) { return __awaiter(_this, void 0, void 0, function () {
                var newShard, buffer, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            if (!(!err && result)) return [3 /*break*/, 1];
                            return [2 /*return*/, resolve(result)];
                        case 1:
                            logger_1.logger.warn('It seems that shard %s download went wrong. Retrying', shard.index);
                            excluded.push(shard.farmer.nodeID);
                            return [4 /*yield*/, fileinfo_1.GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded)];
                        case 2:
                            newShard = _a.sent();
                            if (!newShard[0].farmer) {
                                return [2 /*return*/, reject(Error('File missing shard error'))];
                            }
                            return [4 /*yield*/, this.TryDownloadShardWithFileMuxer(newShard[0], excluded)];
                        case 3:
                            buffer = _a.sent();
                            return [2 /*return*/, resolve(buffer)];
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            err_1 = _a.sent();
                            return [2 /*return*/, reject(err_1)];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
        });
    };
    FileObject.prototype.download = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fileStream, shardSize, lastShardIndex, lastShardSize, sizeToFillToZeroes, streams;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.fileInfo) {
                            throw new Error('Undefined fileInfo');
                        }
                        this.on(constants_1.DOWNLOAD_CANCELLED, function () {
                            _this.stopped = true;
                            console.log('Trying to destroy stream');
                            if (fileStream) {
                                console.log('Destroying stream');
                                fileStream.destroy();
                            }
                        });
                        this.decipher = new decryptstream_1.default(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16));
                        this.decipher.on('error', function (err) { return _this.emit(events_2.DECRYPT.ERROR, err); });
                        this.decipher.on(events_2.DECRYPT.PROGRESS, function (msg) { return _this.emit(events_2.DECRYPT.PROGRESS, msg); });
                        shardSize = rs_wrapper_1.utils.determineShardSize(this.final_length);
                        lastShardIndex = this.rawShards.filter(function (shard) { return !shard.parity; }).length - 1;
                        lastShardSize = this.rawShards[lastShardIndex].size;
                        sizeToFillToZeroes = shardSize - lastShardSize;
                        logger_1.logger.info('%s bytes to be added with zeroes for the last shard', sizeToFillToZeroes);
                        streams = [];
                        return [4 /*yield*/, Promise.all(this.rawShards.map(function (shard, i) { return __awaiter(_this, void 0, void 0, function () {
                                var shardBuffer, content, err_2;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (this.stopped) {
                                                return [2 /*return*/];
                                            }
                                            _a.label = 1;
                                        case 1:
                                            _a.trys.push([1, 3, , 4]);
                                            if (shard.healthy === false) {
                                                throw new Error('Bridge request pointer error');
                                            }
                                            logger_1.logger.info('Downloading shard %s', shard.index);
                                            return [4 /*yield*/, this.TryDownloadShardWithFileMuxer(shard)];
                                        case 2:
                                            shardBuffer = _a.sent();
                                            content = shardBuffer;
                                            logger_1.logger.info('Shard %s downloaded OK', shard.index);
                                            this.emit(events_2.DOWNLOAD.PROGRESS, shardBuffer.length);
                                            if (i === lastShardIndex && sizeToFillToZeroes > 0) {
                                                logger_1.logger.info('Filling with zeroes last shard');
                                                content = Buffer.concat([content, Buffer.alloc(sizeToFillToZeroes).fill(0)]);
                                                logger_1.logger.info('After filling with zeroes, shard size is %s', content.length);
                                            }
                                            streams.push({
                                                content: buffer_1.bufferToStream(content),
                                                index: shard.index
                                            });
                                            shard.healthy = true;
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_2 = _a.sent();
                                            logger_1.logger.error('Error downloading shard %s reason %s', shard.index, err_2.message);
                                            console.error(err_2);
                                            // Fake shard and continue with the next one
                                            streams.push({
                                                content: buffer_1.bufferToStream(Buffer.alloc(shardSize).fill(0)),
                                                index: shard.index
                                            });
                                            shard.healthy = false;
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a.sent();
                        // Order streams by shard index
                        streams.sort(function (sA, sB) { return sA.index - sB.index; });
                        // Unify them
                        fileStream = new MultiStream(streams.map(function (s) { return s.content; }));
                        return [2 /*return*/, fileStream];
                }
            });
        });
    };
    return FileObject;
}(events_1.EventEmitter));
exports.FileObject = FileObject;
