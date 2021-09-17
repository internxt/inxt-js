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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.StreamFileSystemStrategy = void 0;
var async_1 = require("async");
var fs_1 = require("fs");
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var hasher_1 = require("../hasher");
var utils_1 = require("../utils");
var UploadStrategy_1 = require("./UploadStrategy");
var encryptStream_1 = __importDefault(require("../encryptStream"));
var error_1 = require("../utils/error");
var merkleTreeStreams_1 = require("../merkleTreeStreams");
var funnelStream_1 = require("../funnelStream");
var UploadStream_1 = require("./UploadStream");
var TapStream_1 = require("../TapStream");
var ShardObject_1 = require("../../api/ShardObject");
var StreamFileSystemStrategy = /** @class */ (function (_super) {
    __extends(StreamFileSystemStrategy, _super);
    function StreamFileSystemStrategy(params, logger) {
        var _this = _super.call(this) || this;
        _this.abortables = [];
        _this.logger = logger;
        _this.filepath = params.filepath;
        _this.ramUsage = params.desiredRamUsage;
        return _this;
    }
    StreamFileSystemStrategy.prototype.getIv = function () {
        return this.iv;
    };
    StreamFileSystemStrategy.prototype.getFileEncryptionKey = function () {
        return this.fileEncryptionKey;
    };
    StreamFileSystemStrategy.prototype.setIv = function (iv) {
        this.iv = iv;
    };
    StreamFileSystemStrategy.prototype.setFileEncryptionKey = function (fk) {
        this.fileEncryptionKey = fk;
    };
    StreamFileSystemStrategy.prototype.generateShardAccessors = function (filepath, nShards, shardSize, fileSize) {
        var shards = [];
        var _loop_1 = function (i, shardIndex) {
            var start = i;
            var end = Math.min(start + shardSize, fileSize);
            shards.push({
                getStream: function () {
                    return fs_1.createReadStream(filepath, { start: start, end: end - 1 });
                },
                filepath: filepath,
                index: shardIndex,
                size: end - start
            });
            this_1.logger.debug('Shard %s stream generated [byte %s to byte %s]', shardIndex, start, end - 1);
        };
        var this_1 = this;
        for (var i = 0, shardIndex = 0; shardIndex < nShards; i += shardSize, shardIndex++) {
            _loop_1(i, shardIndex);
        }
        return shards;
    };
    // TODO: Extract this to a separate fn
    StreamFileSystemStrategy.prototype.negotiateContracts = function (shardMetas, negotiateContract) {
        return __awaiter(this, void 0, void 0, function () {
            var contracts;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        contracts = [];
                        return [4 /*yield*/, async_1.eachLimit(shardMetas, 6, function (shardMeta, next) {
                                _this.logger.debug('Negotiating contract for shard %s', shardMeta.hash);
                                negotiateContract(shardMeta).then(function (contract) {
                                    contracts.push(__assign(__assign({}, contract), { shardIndex: shardMeta.index }));
                                    next();
                                }).catch(function (err) {
                                    next(err);
                                });
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, contracts];
                }
            });
        });
    };
    StreamFileSystemStrategy.prototype.generateShardMetas = function (shards) {
        var cipher = crypto_1.createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
        return generateShardMetas(shards, cipher);
    };
    StreamFileSystemStrategy.prototype.upload = function (negotiateContract) {
        return __awaiter(this, void 0, void 0, function () {
            var fileSize, shardSize, nShards, concurrency, shards, shardMetas, contracts, uploadTask, reader, tap, slicer, encrypter, uploader, uploads, uploadPipeline;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.emit(UploadStrategy_1.UploadEvents.Started);
                        fileSize = fs_1.statSync(this.filepath).size;
                        shardSize = utils_1.determineShardSize(fileSize);
                        nShards = Math.ceil(fileSize / shardSize);
                        concurrency = Math.min(utils_1.determineConcurrency(this.ramUsage, fileSize), nShards);
                        shards = this.generateShardAccessors(this.filepath, nShards, shardSize, fileSize);
                        return [4 /*yield*/, this.generateShardMetas(shards)];
                    case 1:
                        shardMetas = _a.sent();
                        return [4 /*yield*/, this.negotiateContracts(shardMetas, negotiateContract)];
                    case 2:
                        contracts = _a.sent();
                        uploadTask = function (_a) {
                            var source = _a.stream, cb = _a.finishCb, shardIndex = _a.shardIndex;
                            var contract = contracts.find(function (c) { return c.shardIndex === shardIndex; });
                            var shardMeta = shardMetas.find(function (s) { return s.index === shardIndex; });
                            var url = "http://" + (contract === null || contract === void 0 ? void 0 : contract.farmer.address) + ":" + (contract === null || contract === void 0 ? void 0 : contract.farmer.port) + "/upload/link/" + (shardMeta === null || shardMeta === void 0 ? void 0 : shardMeta.hash);
                            return ShardObject_1.ShardObject.requestPut(url).then(function (putUrl) {
                                _this.logger.debug('Streaming shard %s to %s', shardMeta === null || shardMeta === void 0 ? void 0 : shardMeta.hash, putUrl);
                                return ShardObject_1.ShardObject.putStream(putUrl, source);
                            }).then(function () {
                                _this.logger.debug('Shard %s uploaded correctly', shardMeta === null || shardMeta === void 0 ? void 0 : shardMeta.hash);
                                cb();
                            }).catch(function (err) {
                                throw error_1.wrap('Shard upload error', err);
                            });
                        };
                        reader = fs_1.createReadStream(this.filepath, { highWaterMark: 16384 });
                        tap = new TapStream_1.Tap(shardSize * concurrency);
                        slicer = new funnelStream_1.FunnelStream(shardSize);
                        encrypter = crypto_1.createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                        uploader = new UploadStream_1.UploaderQueueV2(concurrency, nShards, uploadTask);
                        this.abortables.push({
                            abort: function () {
                                try {
                                    reader.destroy();
                                }
                                catch (_a) { }
                            }
                        }, {
                            abort: function () {
                                try {
                                    tap.destroy();
                                }
                                catch (_a) { }
                            }
                        }, {
                            abort: function () {
                                try {
                                    slicer.destroy();
                                }
                                catch (_a) { }
                            }
                        }, {
                            abort: function () {
                                try {
                                    encrypter.destroy();
                                }
                                catch (_a) { }
                            }
                        }, {
                            abort: function () {
                                try {
                                    uploader.destroy();
                                }
                                catch (_a) { }
                            }
                        });
                        console.log('tap allowing an influx of %s bytes', shardSize * concurrency);
                        uploads = [];
                        uploader.on(UploadStream_1.Events.Progress, function (_a) {
                            var shardIndex = _a[0];
                            var _b = shardMetas.find(function (s) { return s.index === shardIndex; }), hash = _b.hash, size = _b.size;
                            _this.emit(UploadStrategy_1.UploadEvents.ShardUploadSuccess, { hash: hash, size: size });
                            uploads.push(0);
                            if (uploads.length === concurrency) {
                                tap.open();
                                uploads = [];
                            }
                        });
                        uploader.once(UploadStream_1.Events.Error, function (_a) {
                            var err = _a[0];
                            uploader.destroy();
                            _this.emit(UploadStrategy_1.UploadEvents.Error, error_1.wrap('Farmer request error', err));
                        });
                        uploader.once(UploadStream_1.Events.End, function () {
                            uploader.destroy();
                            _this.emit(UploadStrategy_1.UploadEvents.Finished, { result: shardMetas });
                        });
                        uploadPipeline = stream_1.pipeline(reader, tap, slicer, encrypter, uploader.getUpstream(), function (err) {
                            if (err) {
                                _this.emit(UploadStrategy_1.UploadEvents.Error, err);
                                uploadPipeline.destroy();
                            }
                        });
                        this.abortables.push({
                            abort: function () {
                                try {
                                    uploadPipeline.destroy();
                                }
                                catch (_a) { }
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    StreamFileSystemStrategy.prototype.abort = function () {
        this.emit(UploadStrategy_1.UploadEvents.Aborted);
        this.abortables.forEach(function (abortable) {
            abortable.abort();
        });
    };
    return StreamFileSystemStrategy;
}(UploadStrategy_1.UploadStrategy));
exports.StreamFileSystemStrategy = StreamFileSystemStrategy;
function calculateShardHash(shard, cipher) {
    var hasher = new hasher_1.HashStream();
    // Avoid cipher to end (in order to reuse it later), using encrypt stream to wrap it
    var encrypter = new encryptStream_1.default(Buffer.from(''), Buffer.from(''), cipher);
    return new Promise(function (resolve, reject) {
        stream_1.pipeline(shard.getStream(), encrypter, hasher, function (err) {
            if (err) {
                return reject(err);
            }
            resolve(hasher.getHash().toString('hex'));
        }).on('data', function () {
            // force data to flow
        });
    });
}
function generateShardMetas(shards, cipher) {
    var shardMetas = [];
    return async_1.eachLimit(shards, 1, function (shard, next) {
        generateShardMeta(shard, cipher).then(function (shardMeta) {
            shardMetas.push(shardMeta);
            next();
        }).catch(function (err) {
            next(err);
        });
    }).then(function () {
        return shardMetas;
    });
}
function generateShardMeta(shard, cipher) {
    return calculateShardHash(shard, cipher).then(function (shardHash) {
        var merkleTree = merkleTreeStreams_1.generateMerkleTree();
        return {
            hash: shardHash,
            size: shard.size,
            index: shard.index,
            parity: false,
            challenges_as_str: merkleTree.challenges_as_str,
            tree: merkleTree.leaf
        };
    });
}
