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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBucketEntry = exports.FileObjectUploadV2 = void 0;
var stream_1 = require("stream");
var crypto_1 = require("crypto");
var ShardObject_1 = require("./ShardObject");
var api_1 = require("../services/api");
var crypto_2 = require("../lib/crypto");
var logger_1 = require("../lib/utils/logger");
var error_1 = require("../lib/utils/error");
var UploadStrategy_1 = require("../lib/upload/UploadStrategy");
var events_1 = require("./events");
var FileObjectUploadV2 = /** @class */ (function (_super) {
    __extends(FileObjectUploadV2, _super);
    function FileObjectUploadV2(config, fileMeta, bucketId, log, uploader, api) {
        var _this = _super.call(this) || this;
        _this.requests = [];
        _this.id = '';
        _this.aborted = false;
        _this.fileEncryptionKey = Buffer.alloc(0);
        _this.fileMeta = fileMeta;
        _this.uploader = uploader;
        _this.config = config;
        _this.index = Buffer.alloc(0);
        _this.bucketId = bucketId;
        _this.frameId = '';
        _this.api = api !== null && api !== void 0 ? api : new api_1.Bridge(_this.config);
        _this.logger = log;
        if (_this.config.inject && _this.config.inject.index) {
            _this.index = _this.config.inject.index;
            _this.logger.debug('Using injected index %s', _this.index.toString('hex'));
        }
        else {
            _this.index = crypto_1.randomBytes(32);
        }
        // this.index = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbaa', 'hex'); 
        _this.iv = _this.index.slice(0, 16);
        _this.once(events_1.Events.Upload.Abort, _this.abort.bind(_this));
        return _this;
    }
    FileObjectUploadV2.prototype.getSize = function () {
        return this.fileMeta.size;
    };
    FileObjectUploadV2.prototype.getId = function () {
        return this.id;
    };
    FileObjectUploadV2.prototype.checkIfIsAborted = function () {
        if (this.isAborted()) {
            throw new Error('Upload aborted');
        }
    };
    FileObjectUploadV2.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.checkIfIsAborted();
                        if (!(this.config.inject && this.config.inject.fileEncryptionKey)) return [3 /*break*/, 1];
                        this.fileEncryptionKey = this.config.inject.fileEncryptionKey;
                        this.logger.debug('Using injected file encryption key %s', this.fileEncryptionKey.toString('hex'));
                        return [3 /*break*/, 3];
                    case 1:
                        _a = this;
                        return [4 /*yield*/, crypto_2.GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index)];
                    case 2:
                        _a.fileEncryptionKey = _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, this];
                }
            });
        });
    };
    FileObjectUploadV2.prototype.checkBucketExistence = function () {
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
    FileObjectUploadV2.prototype.stage = function () {
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
    FileObjectUploadV2.prototype.SaveFileInNetwork = function (bucketEntry) {
        this.checkIfIsAborted();
        var req = this.api.createEntryFromFrame(this.bucketId, bucketEntry);
        this.requests.push(req);
        return req.start()
            .catch(function (err) {
            throw error_1.wrap('Saving file in network error', err);
        });
    };
    FileObjectUploadV2.prototype.GenerateHmac = function (shardMetas) {
        var shardMetasCopy = __spreadArrays(shardMetas).sort(function (sA, sB) { return sA.index - sB.index; });
        var hmac = crypto_2.sha512HmacBuffer(this.fileEncryptionKey);
        for (var _i = 0, shardMetasCopy_1 = shardMetasCopy; _i < shardMetasCopy_1.length; _i++) {
            var shardMeta = shardMetasCopy_1[_i];
            hmac.update(Buffer.from(shardMeta.hash, 'hex'));
        }
        return hmac.digest().toString('hex');
    };
    FileObjectUploadV2.prototype.upload = function () {
        var _this = this;
        this.checkIfIsAborted();
        this.uploader.setFileEncryptionKey(this.fileEncryptionKey);
        this.uploader.setIv(this.iv);
        this.uploader.once(events_1.Events.Upload.Abort, function () { return _this.uploader.emit(events_1.Events.Upload.Error, new Error('Upload aborted')); });
        this.uploader.on(events_1.Events.Upload.Progress, function (progress) { return _this.emit(events_1.Events.Upload.Progress, progress); });
        var errorHandler = function (reject) { return function (err) {
            _this.uploader.removeAllListeners();
            reject(err);
        }; };
        var finishHandler = function (resolve) { return function (message) {
            _this.uploader.removeAllListeners();
            resolve(message.result);
        }; };
        var negotiateContract = function (shardMeta) {
            return new ShardObject_1.ShardObject(_this.api, _this.frameId, shardMeta).negotiateContract();
        };
        return new Promise(function (resolve, reject) {
            _this.uploader.once(UploadStrategy_1.UploadEvents.Error, errorHandler(reject));
            _this.uploader.once(UploadStrategy_1.UploadEvents.Finished, finishHandler(resolve));
            _this.uploader.upload(negotiateContract);
        });
    };
    FileObjectUploadV2.prototype.createBucketEntry = function (shardMetas) {
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
    FileObjectUploadV2.prototype.abort = function () {
        this.aborted = true;
        this.requests.forEach(function (r) { return r.abort(); });
        this.uploader.abort();
    };
    FileObjectUploadV2.prototype.isAborted = function () {
        return this.aborted;
    };
    return FileObjectUploadV2;
}(stream_1.EventEmitter));
exports.FileObjectUploadV2 = FileObjectUploadV2;
function generateBucketEntry(fileObject, fileMeta, shardMetas, rs) {
    var bucketEntry = {
        frame: fileObject.frameId,
        filename: fileMeta.name,
        index: fileObject.index.toString('hex'),
        hmac: { type: 'sha512', value: fileObject.GenerateHmac(shardMetas) }
    };
    if (rs) {
        bucketEntry.erasure = { type: "reedsolomon" };
    }
    return bucketEntry;
}
exports.generateBucketEntry = generateBucketEntry;
