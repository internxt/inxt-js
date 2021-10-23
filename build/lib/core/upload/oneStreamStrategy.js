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
exports.UploadOneStreamStrategy = void 0;
var async_1 = require("async");
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var strategy_1 = require("./strategy");
var merkleTreeStreams_1 = require("../../merkleTreeStreams");
var api_1 = require("../../../api");
var error_1 = require("../../utils/error");
var utils_1 = require("../../utils");
var TapStream_1 = require("../../TapStream");
var funnelStream_1 = require("../../funnelStream");
var logger_1 = require("../../utils/logger");
var __1 = require("../");
/**
 * TODO:
 * - Fix progress notification.
 * - Clean shardmeta array whenever is possible.
 * - Tests
 */
var UploadOneStreamStrategy = /** @class */ (function (_super) {
    __extends(UploadOneStreamStrategy, _super);
    function UploadOneStreamStrategy(params) {
        var _this = _super.call(this) || this;
        _this.abortables = [];
        _this.internalBuffer = [];
        _this.shardMetas = [];
        _this.aborted = false;
        _this.uploadsProgress = [];
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        _this.progressIntervalId = setTimeout(function () { });
        _this.source = params.source;
        _this.startProgressInterval();
        _this.once(__1.Events.Upload.Abort, _this.abort.bind(_this));
        return _this;
    }
    UploadOneStreamStrategy.prototype.getIv = function () {
        return this.iv;
    };
    UploadOneStreamStrategy.prototype.getFileEncryptionKey = function () {
        return this.fileEncryptionKey;
    };
    UploadOneStreamStrategy.prototype.setIv = function (iv) {
        this.iv = iv;
    };
    UploadOneStreamStrategy.prototype.setFileEncryptionKey = function (fk) {
        this.fileEncryptionKey = fk;
    };
    UploadOneStreamStrategy.prototype.startProgressInterval = function () {
        var _this = this;
        this.progressIntervalId = setInterval(function () {
            var currentProgress = _this.uploadsProgress.reduce(function (acumm, progress) { return acumm + progress; }, 0) / _this.uploadsProgress.length;
            _this.emit(__1.Events.Upload.Progress, currentProgress);
        }, 5000);
    };
    UploadOneStreamStrategy.prototype.stopProgressInterval = function () {
        clearInterval(this.progressIntervalId);
    };
    UploadOneStreamStrategy.prototype.upload = function (negotiateContract) {
        return __awaiter(this, void 0, void 0, function () {
            var concurrency, cipher, fileSize, shardSize, readable, tap_1, funnel, nShards_1, uploadPipeline_1, currentShards_1, concurrentTasks_1, finishedTasks_1, totalFinishedTasks_1, uploadQueue_1, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.emit(__1.Events.Upload.Started);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        concurrency = 2;
                        cipher = crypto_1.createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                        fileSize = this.source.size;
                        shardSize = utils_1.determineShardSize(fileSize);
                        readable = this.source.stream;
                        tap_1 = new TapStream_1.Tap(concurrency * shardSize);
                        funnel = new funnelStream_1.FunnelStream(shardSize);
                        nShards_1 = Math.ceil(fileSize / shardSize);
                        this.uploadsProgress = new Array(nShards_1).fill(0);
                        logger_1.logger.debug('Slicing file in %s shards', nShards_1);
                        uploadPipeline_1 = readable.pipe(cipher).pipe(tap_1).pipe(funnel);
                        this.addToAbortables(function () { return uploadPipeline_1.destroy(); });
                        currentShards_1 = [];
                        concurrentTasks_1 = [];
                        finishedTasks_1 = [];
                        totalFinishedTasks_1 = [];
                        uploadQueue_1 = async_1.queue(function (shardMeta, next) {
                            async_1.retry({ times: 3, interval: 500 }, function (nextTry) {
                                logger_1.logger.debug('Negotiating contract for shard %s, hash %s', shardMeta.index, shardMeta.hash);
                                negotiateContract(shardMeta).then(function (contract) {
                                    logger_1.logger.debug('Negotiated contract for shard %s. Uploading ...', shardMeta.index);
                                    _this.uploadShard(shardMeta, contract, function (err) {
                                        if (err) {
                                            return nextTry(err);
                                        }
                                        _this.internalBuffer[shardMeta.index] = Buffer.alloc(0);
                                        _this.uploadsProgress[shardMeta.index] = 1;
                                        nextTry();
                                    });
                                }).catch(function (err) {
                                    nextTry(err);
                                });
                            }, function (err) {
                                if (err) {
                                    return next(err);
                                }
                                next(null);
                            });
                        }, concurrency);
                        this.addToAbortables(function () { return uploadQueue_1.kill(); });
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                uploadPipeline_1.on('data', function (shard) {
                                    var currentShardIndex = currentShards_1.length;
                                    /**
                                     * TODO: Remove Buffer.from?
                                     */
                                    _this.internalBuffer[currentShardIndex] = Buffer.from(shard);
                                    /**
                                     * TODO: calculate shard hash on the fly with a stream
                                     */
                                    var mTree = merkleTreeStreams_1.generateMerkleTree();
                                    var shardMeta = {
                                        hash: calculateShardHash(shard).toString('hex'),
                                        index: currentShardIndex,
                                        parity: false,
                                        size: shard.length,
                                        tree: mTree.leaf,
                                        challenges_as_str: mTree.challenges_as_str
                                    };
                                    _this.shardMetas.push(shardMeta);
                                    concurrentTasks_1.push(0);
                                    currentShards_1.push(0);
                                    uploadQueue_1.push(shardMeta, function (err) {
                                        totalFinishedTasks_1.push(0);
                                        finishedTasks_1.push(0);
                                        if (err) {
                                            return reject(err);
                                        }
                                        if (totalFinishedTasks_1.length === nShards_1) {
                                            _this.cleanup();
                                            resolve(null);
                                            return _this.emit(__1.Events.Upload.Finished, { result: _this.shardMetas });
                                        }
                                        if (finishedTasks_1.length === concurrentTasks_1.length) {
                                            tap_1.open();
                                            finishedTasks_1 = [];
                                            concurrentTasks_1 = [];
                                        }
                                    });
                                });
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        this.handleError(err_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    UploadOneStreamStrategy.prototype.uploadShard = function (shardMeta, contract, cb) {
        var _this = this;
        var url = "http://" + contract.farmer.address + ":" + contract.farmer.port + "/upload/link/" + shardMeta.hash;
        api_1.ShardObject.requestPutTwo(url, function (err, putUrl) {
            if (err) {
                return cb(err);
            }
            api_1.ShardObject.putStreamTwo(putUrl, stream_1.Readable.from(_this.internalBuffer[shardMeta.index]), function (err) {
                if (err) {
                    // TODO: Si el error es un 304, hay que dar el shard por subido.
                    return cb(err);
                }
                cb();
            });
        });
    };
    UploadOneStreamStrategy.prototype.addToAbortables = function (abortFunction) {
        if (this.aborted) {
            abortFunction();
        }
        else {
            this.abortables.push({ abort: abortFunction });
        }
    };
    UploadOneStreamStrategy.prototype.handleError = function (err) {
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.emit(__1.Events.Upload.Error, error_1.wrap('OneStreamStrategyError', err));
    };
    UploadOneStreamStrategy.prototype.abort = function () {
        this.aborted = true;
        this.emit(__1.Events.Upload.Abort);
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.removeAllListeners();
    };
    UploadOneStreamStrategy.prototype.cleanup = function () {
        this.stopProgressInterval();
    };
    return UploadOneStreamStrategy;
}(strategy_1.UploadStrategy));
exports.UploadOneStreamStrategy = UploadOneStreamStrategy;
function calculateShardHash(shard) {
    return crypto_1.createHash('ripemd160').update(crypto_1.createHash('sha256').update(shard).digest()).digest();
}
