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
exports.MultipleStreamsStrategy = void 0;
var async_1 = require("async");
var crypto_1 = require("crypto");
var ShardObject_1 = require("../../api/ShardObject");
var request_1 = require("../../services/request");
var streams_1 = require("../streams");
var utils_1 = require("../utils");
var error_1 = require("../utils/error");
var DownloadStrategy_1 = require("./DownloadStrategy");
function getDownloadStream(shard, cb) {
    ShardObject_1.ShardObject.requestGet(buildRequestUrlShard(shard)).then(request_1.getStream).then(function (stream) {
        cb(null, stream);
    }).catch(function (err) {
        cb(err, null);
    });
}
function buildRequestUrlShard(shard) {
    var _a = shard.farmer, address = _a.address, port = _a.port;
    return "http://" + address + ":" + port + "/download/link/" + shard.hash;
}
var MultipleStreamsStrategy = /** @class */ (function (_super) {
    __extends(MultipleStreamsStrategy, _super);
    function MultipleStreamsStrategy() {
        var _this = _super.call(this) || this;
        _this.abortables = [];
        _this.progressCoefficients = {
            download: 0.9,
            decrypt: 0.1
        };
        if ((_this.progressCoefficients.download + _this.progressCoefficients.decrypt) !== 1) {
            throw new Error('Progress coefficients are wrong');
        }
        return _this;
    }
    MultipleStreamsStrategy.prototype.download = function (mirrors) {
        return __awaiter(this, void 0, void 0, function () {
            var fileSize, concurrency, decipher_1, downloadsBuffer_1, decryptQueue_1, currentShardIndex_1, checkShardsPendingToDecrypt_1, downloadsProgress_1, contractsQueue_1;
            var _this = this;
            return __generator(this, function (_a) {
                fileSize = mirrors.reduce(function (acumm, mirror) { return mirror.size + acumm; }, 0);
                concurrency = utils_1.determineConcurrency(200 * 1024 * 1024, fileSize);
                console.log('concurrency', concurrency);
                try {
                    this.emit(DownloadStrategy_1.DownloadEvents.Start);
                    decipher_1 = crypto_1.createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                    downloadsBuffer_1 = [];
                    decryptQueue_1 = async_1.queue(function (encryptedShard, cb) {
                        if (decipher_1.write(encryptedShard)) {
                            return cb();
                        }
                        decipher_1.once('drain', cb);
                    }, 1);
                    currentShardIndex_1 = 0;
                    checkShardsPendingToDecrypt_1 = function () {
                        var downloadedShardIndex = downloadsBuffer_1.findIndex(function (download) { return download.index === currentShardIndex_1; });
                        var shardReady = downloadedShardIndex !== -1;
                        console.log('shard ready??', shardReady);
                        if (!shardReady) {
                            return;
                        }
                        console.log('currentshardIndex is %s', currentShardIndex_1);
                        var shardsAvailable = true;
                        var isLastShard = false;
                        while (shardsAvailable) {
                            downloadedShardIndex = downloadsBuffer_1.findIndex(function (d) { return d.index === currentShardIndex_1; });
                            console.log('download found', downloadedShardIndex !== -1);
                            if (downloadedShardIndex !== -1) {
                                isLastShard = currentShardIndex_1 === mirrors.length - 1;
                                console.log('is last shard', isLastShard);
                                decryptQueue_1.push(downloadsBuffer_1[downloadedShardIndex].content, isLastShard ? function () { return decipher_1.end(); } : function () { return null; });
                                downloadsBuffer_1[downloadedShardIndex].content = Buffer.alloc(0);
                                currentShardIndex_1++;
                            }
                            else {
                                shardsAvailable = false;
                            }
                        }
                    };
                    downloadsProgress_1 = new Array(mirrors.length).fill(0);
                    setInterval(function () {
                        _this.emit(DownloadStrategy_1.DownloadEvents.Progress, (downloadsProgress_1.reduce(function (acumm, progress) { return acumm + progress; }, 0) *
                            _this.progressCoefficients.download));
                    }, 5000);
                    contractsQueue_1 = async_1.queue(function (mirror, next) {
                        console.log('processing shard for mirror %s', mirror.index);
                        getDownloadStream(mirror, function (err, downloadStream) {
                            console.log('i got the download stream for mirror %s', mirror.index);
                            if (err) {
                                return next(err);
                            }
                            var progressNotifier = new streams_1.ProgressNotifier(fileSize, 2000);
                            progressNotifier.on(streams_1.Events.Progress, function (progress) {
                                downloadsProgress_1[mirror.index] = progress;
                            });
                            bufferToStream(downloadStream.pipe(progressNotifier), function (toStreamErr, res) {
                                console.log('i got the buffer for mirror %s', mirror.index);
                                if (toStreamErr) {
                                    return next(toStreamErr);
                                }
                                downloadsBuffer_1.push({ index: mirror.index, content: res });
                                progressNotifier.destroy();
                                downloadStream.destroy();
                                next();
                            });
                        });
                    }, Math.round(concurrency / 2));
                    mirrors.forEach(function (m) { return contractsQueue_1.push(m, function () { return checkShardsPendingToDecrypt_1(); }); });
                    this.emit(DownloadStrategy_1.DownloadEvents.Ready, decipher_1);
                }
                catch (err) {
                    console.log(err instanceof Error && err.stack);
                    this.emit(DownloadStrategy_1.DownloadEvents.Error, error_1.wrap('MultipleStreamsStrategyError', err));
                }
                return [2 /*return*/];
            });
        });
    };
    MultipleStreamsStrategy.prototype.abort = function () {
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.emit(DownloadStrategy_1.DownloadEvents.Abort);
    };
    return MultipleStreamsStrategy;
}(DownloadStrategy_1.DownloadStrategy));
exports.MultipleStreamsStrategy = MultipleStreamsStrategy;
function bufferToStream(r, cb) {
    var buffers = [];
    r.on('data', buffers.push.bind(buffers));
    r.once('error', function (err) {
        console.log('err', err);
        cb(err, null);
    });
    r.once('end', function () { return cb(null, Buffer.concat(buffers)); });
}
