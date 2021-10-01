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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBucketEntry = exports.FileObjectUpload = void 0;
var events_1 = require("events");
var crypto_1 = require("crypto");
var encryptStream_1 = __importDefault(require("../lib/encryptStream"));
var crypto_2 = require("../lib/crypto");
var funnelStream_1 = require("../lib/funnelStream");
var shardMeta_1 = require("../lib/shardMeta");
var reports_1 = require("./reports");
var error_1 = require("../lib/utils/error");
var constants_1 = require("./constants");
var uploader_1 = require("../lib/upload/uploader");
var logger_1 = require("../lib/utils/logger");
var utils_1 = require("../lib/utils");
var api_1 = require("../services/api");
var ShardObject_1 = require("./ShardObject");
var FileObjectUpload = /** @class */ (function (_super) {
    __extends(FileObjectUpload, _super);
    function FileObjectUpload(config, fileMeta, bucketId, log, api) {
        var _this = _super.call(this) || this;
        _this.requests = [];
        _this.id = '';
        _this.aborted = false;
        _this.shardMetas = [];
        _this.encrypted = false;
        _this.config = config;
        _this.index = Buffer.alloc(0);
        _this.fileMeta = fileMeta;
        _this.bucketId = bucketId;
        _this.frameId = '';
        _this.funnel = new funnelStream_1.FunnelStream(utils_1.determineShardSize(fileMeta.size));
        _this.cipher = new encryptStream_1.default(crypto_1.randomBytes(32), crypto_1.randomBytes(16));
        _this.fileEncryptionKey = crypto_1.randomBytes(32);
        _this.api = api !== null && api !== void 0 ? api : new api_1.Bridge(_this.config);
        _this.logger = log;
        _this.once(constants_1.UPLOAD_CANCELLED, _this.abort.bind(_this));
        return _this;
    }
    FileObjectUpload.prototype.getSize = function () {
        return this.fileMeta.size;
    };
    FileObjectUpload.prototype.getId = function () {
        return this.id;
    };
    FileObjectUpload.prototype.checkIfIsAborted = function () {
        if (this.isAborted()) {
            throw new Error('Upload aborted');
        }
    };
    FileObjectUpload.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.checkIfIsAborted();
                        this.index = crypto_1.randomBytes(32);
                        _a = this;
                        return [4 /*yield*/, crypto_2.GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index)];
                    case 1:
                        _a.fileEncryptionKey = _b.sent();
                        this.cipher = new encryptStream_1.default(this.fileEncryptionKey, this.index.slice(0, 16));
                        return [2 /*return*/, this];
                }
            });
        });
    };
    FileObjectUpload.prototype.checkBucketExistence = function () {
        return __awaiter(this, void 0, void 0, function () {
            var req;
            var _this = this;
            return __generator(this, function (_a) {
                this.checkIfIsAborted();
                req = this.api.getBucketById(this.bucketId);
                this.requests.push(req);
                return [2 /*return*/, req.start().then(function () {
                        logger_1.logger.info('Bucket %s exists', _this.bucketId);
                        return true;
                    }).catch(function (err) {
                        throw error_1.wrap('Bucket existence check error', err);
                    })];
            });
        });
    };
    FileObjectUpload.prototype.stage = function () {
        var _this = this;
        this.checkIfIsAborted();
        var req = this.api.createFrame();
        this.requests.push(req);
        return req.start().then(function (frame) {
            if (!frame || !frame.id) {
                throw new Error('Frame response is empty');
            }
            _this.frameId = frame.id;
            logger_1.logger.info('Staged a file with frame %s', _this.frameId);
        }).catch(function (err) {
            throw error_1.wrap('Bridge frame creation error', err);
        });
    };
    FileObjectUpload.prototype.SaveFileInNetwork = function (bucketEntry) {
        this.checkIfIsAborted();
        var req = this.api.createEntryFromFrame(this.bucketId, bucketEntry);
        this.requests.push(req);
        return req.start()
            .catch(function (err) {
            throw error_1.wrap('Saving file in network error', err);
        });
    };
    FileObjectUpload.prototype.negotiateContract = function (frameId, shardMeta) {
        this.checkIfIsAborted();
        var req = this.api.addShardToFrame(frameId, shardMeta);
        this.requests.push(req);
        return req.start()
            .catch(function (err) {
            throw error_1.wrap('Contract negotiation error', err);
        });
    };
    FileObjectUpload.prototype.NodeRejectedShard = function (encryptedShard, shard) {
        this.checkIfIsAborted();
        var req = this.api.sendShardToNode(shard, encryptedShard);
        this.requests.push(req);
        return req.start()
            .then(function () { return false; })
            .catch(function (err) {
            if (err.response && err.response.status < 400) {
                return true;
            }
            throw error_1.wrap('Farmer request error', err);
        });
    };
    FileObjectUpload.prototype.GenerateHmac = function (shardMetas) {
        var shardMetasCopy = __spreadArrays(shardMetas).sort(function (sA, sB) { return sA.index - sB.index; });
        var hmac = crypto_2.sha512HmacBuffer(this.fileEncryptionKey);
        for (var _i = 0, shardMetasCopy_1 = shardMetasCopy; _i < shardMetasCopy_1.length; _i++) {
            var shardMeta = shardMetasCopy_1[_i];
            hmac.update(Buffer.from(shardMeta.hash, 'hex'));
        }
        return hmac.digest().toString('hex');
    };
    FileObjectUpload.prototype.encrypt = function () {
        this.encrypted = true;
        return this.fileMeta.content.pipe(this.funnel).pipe(this.cipher);
    };
    FileObjectUpload.prototype.parallelUpload = function (callback) {
        var _this = this;
        var shardSize = utils_1.determineShardSize(this.fileMeta.size);
        var ramUsage = 200 * 1024 * 1024; // 200Mb
        var nShards = Math.ceil(this.fileMeta.size / shardSize);
        var concurrency = Math.min(utils_1.determineConcurrency(ramUsage, this.fileMeta.size), nShards);
        logger_1.logger.debug('Using parallel upload (%s shards, %s concurrent uploads)', nShards, concurrency);
        var uploader = new uploader_1.UploaderQueue(concurrency, nShards, this);
        var currentBytesUploaded = 0;
        uploader.on('upload-progress', function (_a) {
            var bytesUploaded = _a[0];
            currentBytesUploaded = updateProgress(_this.getSize(), currentBytesUploaded, bytesUploaded, callback);
        });
        this.on(constants_1.UPLOAD_CANCELLED, function () {
            uploader.emit('error', Error('Upload aborted'));
        });
        var uploadStream = uploader.getUpstream();
        this.cipher.on('data', function (chunk) { return uploadStream.write(chunk); });
        this.cipher.once('end', function () { return uploader.end(); });
        return new Promise(function (resolve, reject) {
            uploader.once('end', function () {
                resolve(_this.shardMetas);
            });
            uploader.once('error', function (_a) {
                var err = _a[0];
                reject(err);
            });
        });
    };
    FileObjectUpload.prototype.upload = function (callback) {
        this.checkIfIsAborted();
        if (!this.encrypted) {
            throw new Error('Tried to upload a file not encrypted. Use .encrypt() before upload()');
        }
        return this.parallelUpload(callback);
    };
    FileObjectUpload.prototype.uploadShard = function (encryptedShard, shardSize, frameId, index, attemps, parity) {
        var _this = this;
        var shardMeta = shardMeta_1.getShardMeta(encryptedShard, shardSize, index, parity);
        logger_1.logger.info('Uploading shard %s index %s size %s parity %s', shardMeta.hash, shardMeta.index, shardMeta.size, parity);
        var shardObject = new ShardObject_1.ShardObject(this.api, frameId, shardMeta);
        shardObject.once(ShardObject_1.ShardObject.Events.NodeTransferFinished, function (_a) {
            var success = _a.success, nodeID = _a.nodeID, hash = _a.hash;
            var exchangeReport = new reports_1.ExchangeReport(_this.config);
            exchangeReport.params.dataHash = hash;
            exchangeReport.params.farmerId = nodeID;
            exchangeReport.params.exchangeEnd = new Date();
            if (success) {
                logger_1.logger.debug('Node %s accepted shard %s', nodeID, hash);
                exchangeReport.UploadOk();
            }
            else {
                exchangeReport.UploadError();
            }
            exchangeReport.sendReport().catch(function () {
                // no op
            });
        });
        return shardObject.upload(encryptedShard)
            .then(function (res) {
            logger_1.logger.info('Shard %s uploaded succesfully', shardMeta.hash);
            return res;
        })
            .catch(function (err) {
            if (attemps > 1 && !_this.aborted) {
                logger_1.logger.error('Upload for shard %s failed. Reason %s. Retrying ...', shardMeta.hash, err.message);
                return _this.uploadShard(encryptedShard, shardSize, frameId, index, attemps - 1, parity);
            }
            throw error_1.wrap('Uploading shard error', err);
        });
    };
    FileObjectUpload.prototype.createBucketEntry = function (shardMetas) {
        var _this = this;
        return this.SaveFileInNetwork(generateBucketEntry(this, this.fileMeta, shardMetas, false))
            .then(function (bucketEntry) {
            if (!bucketEntry) {
                throw new Error('Can not save the file in the network');
            }
            _this.id = bucketEntry.id;
        })
            .catch(function (err) {
            throw error_1.wrap('Bucket entry creation error', err);
        });
    };
    FileObjectUpload.prototype.abort = function () {
        logger_1.logger.info('Aborting file upload');
        this.aborted = true;
        this.requests.forEach(function (r) { return r.abort(); });
        this.funnel.unpipe(this.cipher);
        this.fileMeta.content.unpipe(this.funnel);
        this.fileMeta.content.destroy();
        this.funnel.destroy();
        this.cipher.destroy();
    };
    FileObjectUpload.prototype.isAborted = function () {
        return this.aborted;
    };
    return FileObjectUpload;
}(events_1.EventEmitter));
exports.FileObjectUpload = FileObjectUpload;
function updateProgress(totalBytes, currentBytesUploaded, newBytesUploaded, progress) {
    var newCurrentBytes = currentBytesUploaded + newBytesUploaded;
    var progressCounter = newCurrentBytes / totalBytes;
    progress(progressCounter, newCurrentBytes, totalBytes);
    return newCurrentBytes;
}
function generateBucketEntry(fileObject, fileMeta, shardMetas, rs) {
    var bucketEntry = {
        frame: fileObject.frameId,
        filename: fileMeta.name,
        index: fileObject.index.toString('hex'),
        hmac: { type: 'sha512', value: fileObject.GenerateHmac(shardMetas) }
    };
    // console.log('FINAL HMAC', bucketEntry.hmac);
    if (rs) {
        bucketEntry.erasure = { type: "reedsolomon" };
    }
    return bucketEntry;
}
exports.generateBucketEntry = generateBucketEntry;
