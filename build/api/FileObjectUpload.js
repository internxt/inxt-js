"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.FileObjectUpload = void 0;
var rs_wrapper_1 = require("rs-wrapper");
var crypto_1 = require("crypto");
var api = __importStar(require("../services/request"));
var encryptStream_1 = __importDefault(require("../lib/encryptStream"));
var crypto_2 = require("../lib/crypto");
var funnelStream_1 = require("../lib/funnelStream");
var shardMeta_1 = require("../lib/shardMeta");
var logger_1 = require("../lib/utils/logger");
var reports_1 = require("./reports");
var FileObjectUpload = /** @class */ (function () {
    function FileObjectUpload(config, fileMeta, bucketId) {
        this.config = config;
        this.index = Buffer.alloc(0);
        this.fileMeta = fileMeta;
        this.bucketId = bucketId;
        this.frameId = '';
        this.funnel = new funnelStream_1.FunnelStream(rs_wrapper_1.utils.determineShardSize(fileMeta.size));
        this.cipher = new encryptStream_1.default(crypto_1.randomBytes(32), crypto_1.randomBytes(16));
        this.fileEncryptionKey = crypto_1.randomBytes(32);
    }
    FileObjectUpload.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
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
    FileObjectUpload.prototype.CheckBucketExistance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // if bucket not exists, bridge returns an error
                    return [4 /*yield*/, api.getBucketById(this.config, this.bucketId)];
                    case 1:
                        // if bucket not exists, bridge returns an error
                        _a.sent();
                        logger_1.logger.info('Bucket %s exists', this.bucketId);
                        return [2 /*return*/, true];
                }
            });
        });
    };
    FileObjectUpload.prototype.StageFile = function () {
        var _this = this;
        return api.createFrame(this.config).then(function (frame) {
            if (!frame || !frame.id) {
                throw new Error('Bridge frame staging error');
            }
            _this.frameId = frame.id;
            logger_1.logger.info('Staged a file with frame %s', _this.frameId);
        });
    };
    FileObjectUpload.prototype.SaveFileInNetwork = function (bucketEntry) {
        return api.createEntryFromFrame(this.config, this.bucketId, bucketEntry);
    };
    FileObjectUpload.prototype.NegotiateContract = function (frameId, shardMeta) {
        return api.addShardToFrame(this.config, frameId, shardMeta);
    };
    FileObjectUpload.prototype.NodeRejectedShard = function (encryptedShard, shard) {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, api.sendShardToNode(this.config, shard, encryptedShard)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 2:
                        err_1 = _a.sent();
                        return [2 /*return*/, Promise.reject(err_1)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FileObjectUpload.prototype.GenerateHmac = function (shardMetas) {
        var hmac = crypto_2.sha512HmacBuffer(this.fileEncryptionKey);
        if (shardMetas && shardMetas.length > 0) {
            for (var i = 0; i < shardMetas.length; i++) {
                hmac.update(Buffer.from(shardMetas[i].hash, 'hex'));
            }
        }
        return hmac.digest().toString('hex');
    };
    FileObjectUpload.prototype.StartUploadFile = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info('Starting file upload');
                        return [4 /*yield*/, this.CheckBucketExistance()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.StageFile()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, this.fileMeta.content.pipe(this.funnel).pipe(this.cipher)];
                }
            });
        });
    };
    FileObjectUpload.prototype.UploadShard = function (encryptedShard, shardSize, frameId, index, attemps, parity) {
        return __awaiter(this, void 0, void 0, function () {
            var shardMeta, negotiatedContract, token, operation, farmer, hash, shard, exchangeReport, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        shardMeta = shardMeta_1.getShardMeta(encryptedShard, shardSize, index, parity);
                        logger_1.logger.info('Uploading shard %s index %s size %s parity %s', shardMeta.hash, shardMeta.index, shardMeta.size, parity);
                        token = "", operation = "";
                        farmer = { userAgent: "", protocol: "", address: "", port: 0, nodeID: "", lastSeen: new Date() };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 8]);
                        return [4 /*yield*/, this.NegotiateContract(frameId, shardMeta)];
                    case 2:
                        if (negotiatedContract = _a.sent()) {
                            token = negotiatedContract.token;
                            operation = negotiatedContract.operation;
                            farmer = __assign(__assign({}, negotiatedContract.farmer), { lastSeen: new Date() });
                            logger_1.logger.debug('Contract for shard %s (index %s, size %s) with token %s', shardMeta.hash, shardMeta.index, shardMeta.size, token);
                        }
                        else {
                            throw new Error('Bridge negotiating contract error');
                        }
                        hash = shardMeta.hash;
                        shard = { index: index, replaceCount: 0, hash: hash, size: shardSize, parity: parity, token: token, farmer: farmer, operation: operation };
                        exchangeReport = new reports_1.ExchangeReport(this.config);
                        exchangeReport.params.dataHash = hash;
                        exchangeReport.params.farmerId = shard.farmer.nodeID;
                        return [4 /*yield*/, this.NodeRejectedShard(encryptedShard, shard)];
                    case 3:
                        if (_a.sent()) {
                            exchangeReport.UploadError();
                        }
                        else {
                            logger_1.logger.debug('Node %s accepted shard %s', shard.farmer.nodeID, shard.hash);
                            exchangeReport.UploadOk();
                        }
                        exchangeReport.params.exchangeEnd = new Date();
                        exchangeReport.sendReport().catch(function () {
                            // no op
                        });
                        return [3 /*break*/, 8];
                    case 4:
                        err_2 = _a.sent();
                        if (!(attemps > 1)) return [3 /*break*/, 6];
                        logger_1.logger.error('Upload for shard %s failed. Reason %s. Retrying ...', shardMeta.hash, err_2.message);
                        return [4 /*yield*/, this.UploadShard(encryptedShard, shardSize, frameId, index, --attemps, parity)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6: return [2 /*return*/, Promise.reject(err_2)];
                    case 7: return [3 /*break*/, 8];
                    case 8:
                        logger_1.logger.info('Shard %s uploaded succesfully', shardMeta.hash);
                        return [2 /*return*/, shardMeta];
                }
            });
        });
    };
    return FileObjectUpload;
}());
exports.FileObjectUpload = FileObjectUpload;
