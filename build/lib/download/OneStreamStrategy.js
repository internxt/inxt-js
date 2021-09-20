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
var ShardObject_1 = require("../../api/ShardObject");
var request_1 = require("../../services/request");
var error_1 = require("../utils/error");
var DownloadStrategy_1 = require("./DownloadStrategy");
var OneStreamStrategy = /** @class */ (function (_super) {
    __extends(OneStreamStrategy, _super);
    function OneStreamStrategy() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.abortables = [];
        return _this;
    }
    OneStreamStrategy.prototype.download = function (mirrors) {
        return __awaiter(this, void 0, void 0, function () {
            var decipher_1, downloadStreamsRefs_1, downloadPipeline, lastWriteFinished_1, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        this.emit(DownloadStrategy_1.DownloadEvents.Start);
                        decipher_1 = crypto_1.createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                        downloadStreamsRefs_1 = [];
                        return [4 /*yield*/, async_1.eachLimit(mirrors, 6, function (mirror, next) {
                                getDownloadStream(mirror).then(function (downloadStream) {
                                    downloadStreamsRefs_1.push({
                                        index: mirror.index,
                                        stream: downloadStream
                                    });
                                    next();
                                }).catch(function (err) {
                                    next(err);
                                });
                            })];
                    case 1:
                        _a.sent();
                        downloadStreamsRefs_1.sort(function (a, b) { return a.index - b.index; });
                        downloadPipeline = downloadStreamsRefs_1.map(function (ref) { return ref.stream; });
                        downloadPipeline.forEach(function (stream) {
                            _this.abortables.push({ abort: function () { return stream.destroy(); } });
                        });
                        lastWriteFinished_1 = false;
                        async_1.eachLimit(downloadPipeline, 1, function (download, next) {
                            download.on('data', function (chunk) {
                                if (!decipher_1.write(chunk)) {
                                    lastWriteFinished_1 = false;
                                    decipher_1.once('drain', function () {
                                        lastWriteFinished_1 = true;
                                        download.resume();
                                    });
                                    download.pause();
                                }
                            });
                            download.once('end', function () {
                                var lastWriteWatcherId = setInterval(function () {
                                    if (lastWriteFinished_1) {
                                        next();
                                        clearInterval(lastWriteWatcherId);
                                    }
                                }, 50);
                            });
                            download.once('error', next);
                        }, function (err) {
                            if (err) {
                                _this.emit(DownloadStrategy_1.DownloadEvents.Error, error_1.wrap('OneStreamStrategyError', err));
                                return;
                            }
                            decipher_1.end();
                        });
                        this.emit(DownloadStrategy_1.DownloadEvents.Ready, decipher_1);
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        this.emit(DownloadStrategy_1.DownloadEvents.Error, error_1.wrap('OneStreamStrategyError', err_1));
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    OneStreamStrategy.prototype.abort = function () {
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.emit(DownloadStrategy_1.DownloadEvents.Abort);
    };
    return OneStreamStrategy;
}(DownloadStrategy_1.DownloadStrategy));
exports.OneStreamStrategy = OneStreamStrategy;
function getDownloadStream(shard) {
    return ShardObject_1.ShardObject.requestGet(buildRequestUrlShard(shard)).then(request_1.getStream);
}
function buildRequestUrlShard(shard) {
    var _a = shard.farmer, address = _a.address, port = _a.port;
    return "http://" + address + ":" + port + "/download/link/" + shard.hash;
}
