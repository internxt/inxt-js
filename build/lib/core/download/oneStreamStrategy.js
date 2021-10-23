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
exports.OneStreamStrategy = void 0;
var async_1 = require("async");
var crypto_1 = require("crypto");
var __1 = require("..");
var api_1 = require("../../../api");
var request_1 = require("../../../services/request");
var streams_1 = require("../../utils/streams");
var error_1 = require("../../utils/error");
var logger_1 = require("../../utils/logger");
var strategy_1 = require("./strategy");
var OneStreamStrategy = /** @class */ (function (_super) {
    __extends(OneStreamStrategy, _super);
    function OneStreamStrategy(config) {
        var _a, _b;
        var _this = _super.call(this) || this;
        _this.abortables = [];
        _this.internalBuffer = [];
        _this.downloadsProgress = [];
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        _this.progressIntervalId = setTimeout(function () { });
        _this.aborted = false;
        _this.config = config;
        _this.concurrency = (_b = (_a = _this.config.download) === null || _a === void 0 ? void 0 : _a.concurrency) !== null && _b !== void 0 ? _b : 1;
        _this.decipher = crypto_1.createDecipheriv('aes-256-ctr', crypto_1.randomBytes(32), crypto_1.randomBytes(16));
        _this.startProgressInterval();
        logger_1.logger.debug('Using %s concurrent requests', _this.concurrency);
        _this.addAbortable(function () { return _this.stopProgressInterval(); });
        _this.addAbortable(function () { return _this.internalBuffer = []; });
        return _this;
    }
    OneStreamStrategy.prototype.startProgressInterval = function () {
        var _this = this;
        this.progressIntervalId = setInterval(function () {
            var currentProgress = _this.downloadsProgress.reduce(function (acumm, progress) { return acumm + progress; }, 0) / _this.downloadsProgress.length;
            _this.emit(__1.Events.Download.Progress, currentProgress);
        }, 5000);
    };
    OneStreamStrategy.prototype.stopProgressInterval = function () {
        clearInterval(this.progressIntervalId);
    };
    OneStreamStrategy.prototype.addAbortable = function (abort) {
        this.abortables.push({ abort: abort });
    };
    OneStreamStrategy.prototype.download = function (mirrors) {
        return __awaiter(this, void 0, void 0, function () {
            var lastShardIndexDecrypted_1, downloadTask, downloadQueue_1, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (this.fileEncryptionKey.length === 0 || this.iv.length === 0) {
                            throw new Error('Required decryption data not found');
                        }
                        this.downloadsProgress = new Array(mirrors.length).fill(0);
                        this.decipher = crypto_1.createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                        this.emit(__1.Events.Download.Start);
                        this.emit(__1.Events.Download.Ready, this.decipher);
                        this.once(__1.Events.Download.Error, function (err) { return _this.decipher.emit('error', err); });
                        mirrors.sort(function (mA, mb) { return mA.index - mb.index; });
                        lastShardIndexDecrypted_1 = -1;
                        downloadTask = function (mirror, cb) {
                            async_1.retry({ times: 3, interval: 500 }, function (nextTry) {
                                getDownloadStream(mirror, function (err, shardStream) {
                                    logger_1.logger.debug('Got stream for mirror %s', mirror.index);
                                    if (err) {
                                        return nextTry(err);
                                    }
                                    _this.handleShard(mirror, shardStream, function (downloadErr) {
                                        logger_1.logger.debug('Stream handled for mirror %s', mirror.index);
                                        if (downloadErr) {
                                            return nextTry(downloadErr);
                                        }
                                        var waitingInterval = setInterval(function () {
                                            if (lastShardIndexDecrypted_1 !== mirror.index - 1) {
                                                return;
                                            }
                                            clearInterval(waitingInterval);
                                            _this.decryptShard(mirror.index, function (decryptErr) {
                                                logger_1.logger.debug('Decrypting shard for mirror %s', mirror.index);
                                                if (decryptErr) {
                                                    return nextTry(decryptErr);
                                                }
                                                lastShardIndexDecrypted_1++;
                                                nextTry(null);
                                            });
                                        }, 50);
                                    });
                                }, _this.config.useProxy);
                            }, function (err) {
                                if (err) {
                                    return cb(err);
                                }
                                cb(null);
                            });
                        };
                        downloadQueue_1 = async_1.queue(downloadTask, this.concurrency);
                        this.addAbortable(function () { return downloadQueue_1.kill(); });
                        return [4 /*yield*/, async_1.eachLimit(mirrors, this.concurrency, function (mirror, cb) {
                                if (_this.aborted) {
                                    return cb();
                                }
                                downloadQueue_1.push(mirror, function (err) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    _this.internalBuffer[mirror.index] = Buffer.alloc(0);
                                    var isLastShard = mirror.index === mirrors.length - 1;
                                    if (isLastShard) {
                                        _this.cleanup();
                                        _this.emit(__1.Events.Download.Progress, 1);
                                        _this.decipher.end();
                                    }
                                    cb();
                                });
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        this.handleError(err_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    OneStreamStrategy.prototype.cleanup = function () {
        this.stopProgressInterval();
    };
    OneStreamStrategy.prototype.decryptShard = function (index, cb) {
        if (this.decipher.write(this.internalBuffer[index])) {
            return cb(null);
        }
        this.decipher.once('drain', cb);
    };
    OneStreamStrategy.prototype.handleShard = function (shard, stream, cb) {
        var _this = this;
        var errored = false;
        var shardBuffers = [];
        var exchangeReport = api_1.ExchangeReport.build(this.config, shard);
        var progressNotifier = new streams_1.ProgressNotifier(shard.size, 2000);
        var hasher = new streams_1.HashStream();
        var downloadPipeline = stream.pipe(progressNotifier).pipe(hasher);
        progressNotifier.on(streams_1.Events.Progress, function (progress) {
            _this.downloadsProgress[shard.index] = progress;
        });
        downloadPipeline.on('data', shardBuffers.push.bind(shardBuffers));
        downloadPipeline.once('error', function (err) {
            errored = true;
            exchangeReport.error();
            cb(err);
        }).once('end', function () {
            if (errored) {
                return;
            }
            var hash = hasher.getHash().toString('hex');
            if (hash !== shard.hash) {
                exchangeReport.error();
                return cb(new Error("Hash for downloaded shard " + shard.hash + " does not match"));
            }
            exchangeReport.success();
            _this.internalBuffer[shard.index] = Buffer.concat(shardBuffers);
            cb(null);
        });
    };
    OneStreamStrategy.prototype.handleError = function (err) {
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.decipher.emit('error', error_1.wrap('OneStreamStrategy', err));
    };
    OneStreamStrategy.prototype.abort = function () {
        this.aborted = true;
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.emit(__1.Events.Download.Abort);
    };
    return OneStreamStrategy;
}(strategy_1.DownloadStrategy));
exports.OneStreamStrategy = OneStreamStrategy;
function getDownloadStream(shard, cb, useProxy) {
    if (useProxy === void 0) { useProxy = false; }
    api_1.ShardObject.requestGet(buildRequestUrlShard(shard), useProxy).then(function (url) { return request_1.getStream(url, { useProxy: useProxy }); }).then(function (stream) {
        cb(null, stream);
    }).catch(function (err) {
        cb(err, null);
    });
}
function buildRequestUrlShard(shard) {
    var _a = shard.farmer, address = _a.address, port = _a.port;
    return "http://" + address + ":" + port + "/download/link/" + shard.hash;
}
