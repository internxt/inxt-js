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
exports.DownloadQueue = void 0;
var async_1 = require("async");
var events_1 = require("events");
var stream_1 = require("stream");
var concurrentQueue_1 = require("../concurrentQueue");
var buffer_1 = require("../utils/buffer");
var DownloadQueue = /** @class */ (function (_super) {
    __extends(DownloadQueue, _super);
    function DownloadQueue(parallelDownloads, expectedDownloads, fileObject) {
        if (parallelDownloads === void 0) { parallelDownloads = 1; }
        if (expectedDownloads === void 0) { expectedDownloads = 1; }
        var _this = _super.call(this, parallelDownloads, expectedDownloads) || this;
        _this.eventEmitter = new events_1.EventEmitter();
        _this.passthrough = new stream_1.PassThrough();
        _this.pendingShards = [];
        _this.concurrency = parallelDownloads;
        _this.fileObject = fileObject;
        _this.setQueueTask(_this.download().bind(_this));
        return _this;
        // setInterval(() => {
        //   console.log('PENDING SHARDS', this.pendingShards.map((s) => s.shard.index));
        // }, 3000);
    }
    DownloadQueue.prototype.download = function () {
        var _this = this;
        return function (req) {
            return _this.fileObject.TryDownloadShardWithFileMuxer(req.shard, []).then(function (shardContent) {
                if (shardContent) {
                    _this.handleData(buffer_1.bufferToStream(shardContent), req.shard);
                }
            });
        };
    };
    DownloadQueue.prototype.getDownstream = function () {
        return this.passthrough;
    };
    DownloadQueue.prototype.start = function (shards) {
        var _this = this;
        var shardsCopy = shards;
        this.on('next-pack', function () {
            // console.log('INCOMING NEXT-PACK', shardsCopy.slice(0, this.concurrency).map(s => s.index));
            shardsCopy.splice(0, _this.concurrency).forEach(function (shard) {
                _this.push({ index: shard.index, shard: shard });
            });
        });
        this.emit('next-pack');
    };
    DownloadQueue.prototype.handleData = function (shardContent, shard) {
        // console.log('HANDLING DATA FOR SHARD %s', shard.index);
        var _this = this;
        this.pendingShards.push({ content: shardContent, shard: shard });
        // buffering content until pack is full
        if (this.pendingShards.length < this.concurrency) {
            return;
        }
        this.emptyPendingShards().then(function () {
            _this.emit('next-pack');
        }).catch(function (err) {
            _this.cleanup();
            _this.emit('error', err);
        });
    };
    DownloadQueue.prototype.emptyPendingShards = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.pendingShards.sort(function (a, b) { return a.shard.index - b.shard.index; });
                        return [4 /*yield*/, async_1.eachLimit(this.pendingShards, 1, function (pendingShard, next) {
                                if (pendingShard.content) {
                                    pendingShard.content.pipe(_this.passthrough, { end: false })
                                        .once('error', next);
                                    pendingShard.content.once('end', function () {
                                        // console.log('WRITE END FOR SHARD %s, going for next', pendingShard.shard.index);
                                        next();
                                    });
                                    pendingShard.content = null; // free memory explictly
                                }
                                else {
                                    next(Error('Shard is null'));
                                }
                            })];
                    case 1:
                        _a.sent();
                        this.pendingShards = [];
                        return [2 /*return*/];
                }
            });
        });
    };
    DownloadQueue.prototype.cleanup = function () {
        this.pendingShards = [];
    };
    DownloadQueue.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.eventEmitter.emit(event, args);
    };
    DownloadQueue.prototype.getListenerCount = function (event) {
        return this.eventEmitter.listenerCount(event);
    };
    DownloadQueue.prototype.getListeners = function (event) {
        return this.eventEmitter.listeners(event);
    };
    DownloadQueue.prototype.on = function (event, listener) {
        this.eventEmitter.on(event, listener);
        return this;
    };
    DownloadQueue.prototype.end = function (cb) {
        var _this = this;
        _super.prototype.end.call(this, function () {
            if (cb) {
                cb();
            }
            _this.emit('end');
        });
    };
    return DownloadQueue;
}(concurrentQueue_1.ConcurrentQueue));
exports.DownloadQueue = DownloadQueue;
