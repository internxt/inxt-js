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
var logger_1 = require("../lib/utils/logger");
var constants_1 = require("./constants");
var error_1 = require("../lib/utils/error");
var stream_1 = require("../lib/utils/stream");
var FileObject = /** @class */ (function (_super) {
    __extends(FileObject, _super);
    function FileObject(config, bucketId, fileId, debug) {
        var _this = _super.call(this) || this;
        _this.shards = [];
        _this.rawShards = [];
        _this.length = -1;
        _this.final_length = -1;
        _this.totalSizeWithECs = 0;
        _this.aborted = false;
        _this.config = config;
        _this.bucketId = bucketId;
        _this.fileId = fileId;
        _this.debug = debug;
        _this.fileKey = Buffer.alloc(0);
        _this.decipher = new decryptstream_1.default(crypto_1.randomBytes(32), crypto_1.randomBytes(16));
        _this.once(constants_1.DOWNLOAD_CANCELLED, _this.abort.bind(_this));
        // DOWNLOAD_CANCELLED attach one listener per concurrent download
        _this.setMaxListeners(100);
        return _this;
    }
    FileObject.prototype.checkIfIsAborted = function () {
        if (this.isAborted()) {
            throw new Error('Download aborted');
        }
    };
    FileObject.prototype.getInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.checkIfIsAborted();
                        logger_1.logger.info('Retrieving file info...');
                        if (!!this.fileInfo) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileInfo(this.config, this.bucketId, this.fileId)
                                .catch(function (err) {
                                throw error_1.wrap('Get file info error', err);
                            })];
                    case 1:
                        _a.fileInfo = _c.sent();
                        if (!this.config.encryptionKey) return [3 /*break*/, 3];
                        _b = this;
                        return [4 /*yield*/, crypto_2.GenerateFileKey(this.config.encryptionKey, this.bucketId, Buffer.from(this.fileInfo.index, 'hex'))
                                .catch(function (err) {
                                throw error_1.wrap('Generate file key error', err);
                            })];
                    case 2:
                        _b.fileKey = _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/, this.fileInfo];
                }
            });
        });
    };
    FileObject.prototype.getMirrors = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.checkIfIsAborted();
                        logger_1.logger.info('Retrieving file mirrors...');
                        // Discard mirrors for shards with parities (ECs)
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileMirrors(this.config, this.bucketId, this.fileId)];
                    case 1:
                        // Discard mirrors for shards with parities (ECs)
                        _a.rawShards = (_b.sent()).filter(function (shard) { return !shard.parity; });
                        return [4 /*yield*/, async_1.eachLimit(this.rawShards, 1, function (shard, nextShard) {
                                var attempts = 0;
                                var farmerIsOk = shard.farmer && shard.farmer.nodeID && shard.farmer.port && shard.farmer.address;
                                if (farmerIsOk) {
                                    shard.farmer.address = shard.farmer.address.trim();
                                    return nextShard(null);
                                }
                                logger_1.logger.warn('Pointer for shard %s failed, retrieving a new one', shard.index);
                                var validPointer = false;
                                async_1.doUntil(function (next) {
                                    fileinfo_1.ReplacePointer(_this.config, _this.bucketId, _this.fileId, shard.index, []).then(function (newShard) {
                                        next(null, newShard[0]);
                                    }).catch(function (err) {
                                        next(err, null);
                                    }).finally(function () {
                                        attempts++;
                                    });
                                }, function (result, next) {
                                    validPointer = result && result.farmer && result.farmer.nodeID && result.farmer.port && result.farmer.address ? true : false;
                                    return next(null, validPointer || attempts >= constants_1.DEFAULT_INXT_MIRRORS);
                                }).then(function (result) {
                                    logger_1.logger.info('Pointer replaced for shard %s', shard.index);
                                    if (!validPointer) {
                                        throw new Error("Missing pointer for shard " + shard.hash);
                                    }
                                    result.farmer.address = result.farmer.address.trim();
                                    _this.rawShards[shard.index] = result;
                                    nextShard(null);
                                }).catch(function (err) {
                                    nextShard(error_1.wrap('Bridge request pointer error', err));
                                });
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
    FileObject.prototype.TryDownloadShardWithFileMuxer = function (shard, excluded) {
        var _this = this;
        if (excluded === void 0) { excluded = []; }
        this.checkIfIsAborted();
        logger_1.logger.info('Downloading shard %s from farmer %s', shard.index, shard.farmer.nodeID);
        var exchangeReport = new reports_1.ExchangeReport(this.config);
        return new Promise(function (resolve, reject) {
            var _a;
            async_1.retry({ times: ((_a = _this.config.config) === null || _a === void 0 ? void 0 : _a.shardRetry) || 3, interval: 1000 }, function (nextTry) { return __awaiter(_this, void 0, void 0, function () {
                var downloadHasError, downloadError, downloadCancelled, oneFileMuxer, shardObject, buffs, downloaderStream;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            exchangeReport.params.exchangeStart = new Date();
                            exchangeReport.params.farmerId = shard.farmer.nodeID;
                            exchangeReport.params.dataHash = shard.hash;
                            downloadHasError = false;
                            downloadError = null;
                            downloadCancelled = false;
                            oneFileMuxer = new filemuxer_1.default({ shards: 1, length: shard.size });
                            shardObject = new ShardObject_1.ShardObject(this.config, shard, this.bucketId, this.fileId);
                            buffs = [];
                            this.once(constants_1.DOWNLOAD_CANCELLED, function () {
                                buffs = [];
                                downloadCancelled = true;
                                if (downloaderStream) {
                                    downloaderStream.destroy();
                                }
                            });
                            oneFileMuxer.on(events_2.FILEMUXER.PROGRESS, function (msg) { return _this.emit(events_2.FILEMUXER.PROGRESS, msg); });
                            oneFileMuxer.on('error', function (err) {
                                if (err.message === constants_1.DOWNLOAD_CANCELLED_ERROR) {
                                    return;
                                }
                                downloadHasError = true;
                                downloadError = err;
                                _this.emit(events_2.FILEMUXER.ERROR, err);
                                exchangeReport.DownloadError();
                                exchangeReport.sendReport().catch(function () { return null; });
                                oneFileMuxer.emit('drain');
                            });
                            oneFileMuxer.on('data', function (data) { buffs.push(data); });
                            oneFileMuxer.once('drain', function () {
                                logger_1.logger.info('Drain received for shard %s', shard.index);
                                if (downloadCancelled) {
                                    nextTry(null, Buffer.alloc(0));
                                    return;
                                }
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
                            if (!!err) return [3 /*break*/, 1];
                            if (result) {
                                resolve(result);
                            }
                            else {
                                reject(error_1.wrap('Empty result from downloading shard', new Error('')));
                            }
                            return [3 /*break*/, 4];
                        case 1:
                            logger_1.logger.warn('It seems that shard %s download from farmer %s went wrong. Replacing pointer', shard.index, shard.farmer.nodeID);
                            excluded.push(shard.farmer.nodeID);
                            return [4 /*yield*/, fileinfo_1.GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded)];
                        case 2:
                            newShard = _a.sent();
                            if (!newShard[0].farmer) {
                                return [2 /*return*/, reject(error_1.wrap('File missing shard error', err))];
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
        var _this = this;
        if (!this.fileInfo) {
            throw new Error('Undefined fileInfo');
        }
        this.decipher = new decryptstream_1.default(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))
            .on(events_2.Decrypt.Progress, function (msg) {
            _this.emit(events_2.Decrypt.Progress, msg);
        })
            .on('error', function (err) {
            _this.emit(events_2.Decrypt.Error, err);
        });
        async_1.eachLimit(this.rawShards, 1, function (shard, nextItem) {
            _this.checkIfIsAborted();
            if (shard.healthy === false) {
                throw new Error('Bridge request pointer error');
            }
            _this.TryDownloadShardWithFileMuxer(shard).then(function (shardBuffer) {
                logger_1.logger.info('Shard %s downloaded OK', shard.index);
                _this.emit(events_2.Download.Progress, shardBuffer.length);
                if (!_this.decipher.write(shardBuffer)) {
                    return stream_1.drainStream(_this.decipher);
                }
            }).then(function () {
                nextItem();
            }).catch(function (err) {
                nextItem(error_1.wrap('Download shard error', err));
            });
        }, function () {
            _this.decipher.end();
        });
        return this.decipher;
    };
    FileObject.prototype.abort = function () {
        this.debug.info('Aborting file upload');
        this.aborted = true;
    };
    FileObject.prototype.isAborted = function () {
        return this.aborted;
    };
    return FileObject;
}(events_1.EventEmitter));
exports.FileObject = FileObject;
