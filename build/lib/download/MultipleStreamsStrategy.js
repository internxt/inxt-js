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
exports.MultipleStreamsStrategy = void 0;
var async_1 = require("async");
var crypto_1 = require("crypto");
var events_1 = __importDefault(require("events"));
var events_2 = require("../../api/events");
var reports_1 = require("../../api/reports");
var ShardObject_1 = require("../../api/ShardObject");
var hasher_1 = require("../hasher");
var streams_1 = require("../streams");
var utils_1 = require("../utils");
var error_1 = require("../utils/error");
var DownloadStrategy_1 = require("./DownloadStrategy");
var MultipleStreamsStrategy = /** @class */ (function (_super) {
    __extends(MultipleStreamsStrategy, _super);
    function MultipleStreamsStrategy(config) {
        var _this = _super.call(this) || this;
        _this.abortables = [];
        _this.decryptBuffer = [];
        _this.currentShardIndex = 0;
        _this.mirrors = [];
        _this.downloadsProgress = [];
        _this.aborted = false;
        _this.progressIntervalId = setTimeout(function () { });
        _this.queues = {
            downloadQueue: async_1.queue(function () { }),
            decryptQueue: async_1.queue(function () { })
        };
        _this.progressCoefficients = {
            download: 0.95,
            decrypt: 0.05
        };
        _this.config = config;
        if ((_this.progressCoefficients.download + _this.progressCoefficients.decrypt) !== 1) {
            throw new Error('Progress coefficients are wrong');
        }
        _this.startProgressInterval();
        _this.addAbortable(function () { return _this.stopProgressInterval(); });
        _this.addAbortable(function () { return _this.decryptBuffer = []; });
        _this.decipher = crypto_1.createDecipheriv('aes-256-ctr', crypto_1.randomBytes(32), crypto_1.randomBytes(16));
        return _this;
    }
    MultipleStreamsStrategy.prototype.startProgressInterval = function () {
        var _this = this;
        this.progressIntervalId = setInterval(function () {
            var currentProgress = _this.downloadsProgress.reduce(function (acumm, progress) { return acumm + progress; }, 0);
            _this.emit(events_2.Events.Download.Progress, currentProgress * _this.progressCoefficients.download);
        }, 5000);
    };
    MultipleStreamsStrategy.prototype.stopProgressInterval = function () {
        clearInterval(this.progressIntervalId);
    };
    MultipleStreamsStrategy.prototype.addAbortable = function (abort) {
        this.abortables.push({ abort: abort });
    };
    MultipleStreamsStrategy.prototype.buildDownloadTask = function (fileSize, abortSignal) {
        var _this = this;
        var shouldStop = false;
        abortSignal.once('abort', function () {
            shouldStop = true;
        });
        return function (mirror, cb) {
            var report = reports_1.ExchangeReport.build(_this.config, mirror);
            ShardObject_1.ShardObject.getDownloadStream(mirror, function (err, downloadStream) {
                if (shouldStop) {
                    return cb(null);
                }
                if (err) {
                    report.error();
                    return cb(err);
                }
                _this.addAbortable(function () { return downloadStream === null || downloadStream === void 0 ? void 0 : downloadStream.emit('signal', 'Destroy request'); });
                var progressNotifier = new streams_1.ProgressNotifier(fileSize, 2000);
                var hasher = new hasher_1.HashStream();
                progressNotifier.on(streams_1.Events.Progress, function (progress) {
                    _this.downloadsProgress[mirror.index] = progress;
                });
                var downloadPipeline = downloadStream.pipe(progressNotifier).pipe(hasher);
                bufferToStream(downloadPipeline, function (toBufferErr, res) {
                    if (shouldStop) {
                        return cb(null);
                    }
                    if (toBufferErr) {
                        report.error();
                        return cb(toBufferErr);
                    }
                    var hash = hasher.getHash().toString('hex');
                    if (hash !== mirror.hash) {
                        report.error();
                        return cb(new Error("Hash for shard " + mirror.hash + " do not match"));
                    }
                    report.success();
                    _this.decryptBuffer.push({ index: mirror.index, content: res });
                    cb(null);
                });
            });
        };
    };
    MultipleStreamsStrategy.prototype.buildDownloadQueue = function (fileSize, concurrency) {
        var _this = this;
        if (concurrency === void 0) { concurrency = 1; }
        var task = function (mirror, next) {
            async_1.retry({ times: 3, interval: 500 }, function (nextTry) {
                _this.buildDownloadTask(fileSize, new events_1.default())(mirror, nextTry);
            }).then(function () {
                next();
            }).catch(function (err) {
                next(err);
            });
        };
        return async_1.queue(task, concurrency);
    };
    MultipleStreamsStrategy.prototype.download = function (mirrors) {
        return __awaiter(this, void 0, void 0, function () {
            var fileSize, concurrency;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    if (this.fileEncryptionKey.length === 0 || this.iv.length === 0) {
                        throw new Error('Required decryption data not found');
                    }
                    this.decipher = crypto_1.createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                    this.emit(events_2.Events.Download.Ready, this.decipher);
                    // As we emit the decipher asap, the decipher should be used as the error channel
                    this.once(events_2.Events.Download.Error, function (err) { return _this.decipher.emit('error', err); });
                    this.mirrors = mirrors;
                    this.mirrors.sort(function (mA, mB) { return mA.index - mB.index; });
                    this.downloadsProgress = new Array(mirrors.length).fill(0);
                    fileSize = this.mirrors.reduce(function (acumm, mirror) { return mirror.size + acumm; }, 0);
                    concurrency = utils_1.determineConcurrency(200 * 1024 * 1024, fileSize);
                    this.queues.decryptQueue = buildDecryptQueue(this.decipher);
                    this.queues.downloadQueue = this.buildDownloadQueue(fileSize, concurrency);
                    this.addAbortable(function () { return _this.queues.downloadQueue.kill(); });
                    this.addAbortable(function () { return _this.queues.decryptQueue.kill(); });
                    this.queues.downloadQueue.push(mirrors, function (err) {
                        if (_this.aborted) {
                            return;
                        }
                        if (err) {
                            return _this.handleError(err);
                        }
                        _this.checkShardsPendingToDecrypt(_this.decipher);
                    });
                }
                catch (err) {
                    this.handleError(err);
                }
                return [2 /*return*/];
            });
        });
    };
    MultipleStreamsStrategy.prototype.handleError = function (err) {
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.decipher.emit('error', error_1.wrap('MultipleStreamsStreategy', err));
    };
    MultipleStreamsStrategy.prototype.checkShardsPendingToDecrypt = function (decipher) {
        var _this = this;
        var downloadedShardIndex = this.decryptBuffer.findIndex(function (pendingDecrypt) { return pendingDecrypt.index === _this.currentShardIndex; });
        var shardReady = downloadedShardIndex !== -1;
        if (!shardReady) {
            return;
        }
        var shardsAvailable = true;
        var isLastShard = false;
        while (shardsAvailable) {
            downloadedShardIndex = this.decryptBuffer.findIndex(function (pendingDecrypt) { return pendingDecrypt.index === _this.currentShardIndex; });
            if (downloadedShardIndex !== -1) {
                isLastShard = this.currentShardIndex === this.mirrors.length - 1;
                this.queues.decryptQueue.push(this.decryptBuffer[downloadedShardIndex].content, isLastShard ? function () {
                    _this.stopProgressInterval();
                    decipher.end();
                } : function () { return null; });
                this.decryptBuffer[downloadedShardIndex].content = Buffer.alloc(0);
                this.currentShardIndex++;
            }
            else {
                shardsAvailable = false;
            }
        }
    };
    MultipleStreamsStrategy.prototype.abort = function () {
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.emit(events_2.Events.Download.Abort);
    };
    return MultipleStreamsStrategy;
}(DownloadStrategy_1.DownloadStrategy));
exports.MultipleStreamsStrategy = MultipleStreamsStrategy;
function buildDecryptQueue(decipher) {
    return async_1.queue(function (encryptedShard, cb) {
        if (decipher.write(encryptedShard)) {
            return cb();
        }
        decipher.once('drain', cb);
    }, 1);
}
function bufferToStream(r, cb) {
    var buffers = [];
    r.on('data', buffers.push.bind(buffers));
    r.once('error', function (err) { return cb(err, null); });
    r.once('end', function () { return cb(null, Buffer.concat(buffers)); });
}
