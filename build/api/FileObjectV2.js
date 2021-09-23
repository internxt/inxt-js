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
exports.FileObjectV2 = void 0;
var crypto_1 = require("crypto");
var events_1 = require("events");
var async_1 = require("async");
var decryptstream_1 = __importDefault(require("../lib/decryptstream"));
var crypto_2 = require("../lib/crypto");
var fileinfo_1 = require("./fileinfo");
var logger_1 = require("../lib/utils/logger");
var constants_1 = require("./constants");
var error_1 = require("../lib/utils/error");
var api_1 = require("../services/api");
var DownloadStrategy_1 = require("../lib/download/DownloadStrategy");
var FileObjectV2 = /** @class */ (function (_super) {
    __extends(FileObjectV2, _super);
    function FileObjectV2(config, bucketId, fileId, debug, downloader) {
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
        _this.api = new api_1.Bridge(config);
        _this.downloader = downloader;
        _this.once(constants_1.DOWNLOAD_CANCELLED, _this.abort.bind(_this));
        return _this;
    }
    FileObjectV2.prototype.setFileEncryptionKey = function (key) {
        this.fileKey = key;
    };
    FileObjectV2.prototype.setFileToken = function (token) {
        this.fileToken = token;
    };
    FileObjectV2.prototype.checkIfIsAborted = function () {
        if (this.isAborted()) {
            throw new Error('Download aborted');
        }
    };
    FileObjectV2.prototype.getInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.checkIfIsAborted();
                        logger_1.logger.info('Retrieving file info...');
                        if (!!this.fileInfo) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, fileinfo_1.GetFileInfo(this.config, this.bucketId, this.fileId, this.fileToken)
                                .catch(function (err) {
                                throw error_1.wrap('Get file info error', err);
                            })];
                    case 1:
                        _a.fileInfo = _c.sent();
                        if (!(this.fileKey.length === 0 && this.config.encryptionKey)) return [3 /*break*/, 3];
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
    FileObjectV2.prototype.getMirrors = function () {
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
                        return [4 /*yield*/, fileinfo_1.GetFileMirrors(this.config, this.bucketId, this.fileId, this.fileToken)];
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
    FileObjectV2.prototype.download = function () {
        var _this = this;
        if (!this.fileInfo) {
            throw new Error('Undefined fileInfo');
        }
        var fk = this.fileKey.slice(0, 32);
        var iv = Buffer.from(this.fileInfo.index, 'hex').slice(0, 16);
        this.downloader.setIv(iv);
        this.downloader.setFileEncryptionKey(fk);
        this.downloader.once(DownloadStrategy_1.DownloadEvents.Abort, function () { return _this.downloader.emit(DownloadStrategy_1.DownloadEvents.Error, new Error('Download aborted')); });
        this.downloader.on(DownloadStrategy_1.DownloadEvents.Progress, function (progress) { return _this.emit(DownloadStrategy_1.DownloadEvents.Progress, progress); });
        return new Promise(function (resolve) {
            _this.downloader.once(DownloadStrategy_1.DownloadEvents.Ready, resolve);
            _this.downloader.download(_this.rawShards.filter(function (s) { return !s.parity; }));
        });
    };
    FileObjectV2.prototype.abort = function () {
        this.debug.info('Aborting file upload');
        this.aborted = true;
    };
    FileObjectV2.prototype.isAborted = function () {
        return this.aborted;
    };
    return FileObjectV2;
}(events_1.EventEmitter));
exports.FileObjectV2 = FileObjectV2;
