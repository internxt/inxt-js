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
exports.OneStreamStrategy = void 0;
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var UploadStrategy_1 = require("./UploadStrategy");
var merkleTreeStreams_1 = require("../merkleTreeStreams");
var ShardObject_1 = require("../../api/ShardObject");
var error_1 = require("../utils/error");
var streams_1 = require("../streams");
var abort_controller_1 = __importDefault(require("abort-controller"));
var OneStreamStrategy = /** @class */ (function (_super) {
    __extends(OneStreamStrategy, _super);
    function OneStreamStrategy(params) {
        var _this = _super.call(this) || this;
        _this.abortables = [];
        _this.source = params.source;
        return _this;
    }
    OneStreamStrategy.prototype.getIv = function () {
        return this.iv;
    };
    OneStreamStrategy.prototype.getFileEncryptionKey = function () {
        return this.fileEncryptionKey;
    };
    OneStreamStrategy.prototype.setIv = function (iv) {
        this.iv = iv;
    };
    OneStreamStrategy.prototype.setFileEncryptionKey = function (fk) {
        this.fileEncryptionKey = fk;
    };
    OneStreamStrategy.prototype.upload = function (negotiateContract) {
        return __awaiter(this, void 0, void 0, function () {
            var merkleTree, shardMeta, contract, url, encrypter, progressNotifier, putUrl, uploadPipeline_1, controller_1, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        this.emit(UploadStrategy_1.UploadEvents.Started);
                        merkleTree = merkleTreeStreams_1.generateMerkleTree();
                        shardMeta = {
                            hash: this.source.hash,
                            size: this.source.size,
                            index: 0,
                            parity: false,
                            challenges_as_str: merkleTree.challenges_as_str,
                            tree: merkleTree.leaf
                        };
                        return [4 /*yield*/, negotiateContract(shardMeta)];
                    case 1:
                        contract = _a.sent();
                        url = buildUrlFromContract(contract);
                        encrypter = crypto_1.createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
                        progressNotifier = new streams_1.ProgressNotifier(this.source.size);
                        progressNotifier.on(streams_1.Events.Progress, function (progress) {
                            _this.emit(UploadStrategy_1.UploadEvents.Progress, progress);
                        });
                        return [4 /*yield*/, ShardObject_1.ShardObject.requestPut(url)];
                    case 2:
                        putUrl = _a.sent();
                        uploadPipeline_1 = stream_1.pipeline(this.source.stream, encrypter, progressNotifier, function (err) {
                            if (err) {
                                uploadPipeline_1.destroy();
                                _this.emit(UploadStrategy_1.UploadEvents.Error, error_1.wrap('OneStreamStrategyError', err));
                            }
                        });
                        controller_1 = new abort_controller_1.default();
                        this.addToAbortables(function () { return uploadPipeline_1.destroy(); });
                        this.addToAbortables(function () { return controller_1.abort(); });
                        return [4 /*yield*/, ShardObject_1.ShardObject.putStream(putUrl, uploadPipeline_1, controller_1)];
                    case 3:
                        _a.sent();
                        this.emit(UploadStrategy_1.UploadEvents.Finished, { result: [shardMeta] });
                        cleanStreams([progressNotifier, uploadPipeline_1, encrypter, this.source.stream]);
                        cleanEventEmitters([this]);
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        this.emit(UploadStrategy_1.UploadEvents.Error, error_1.wrap('OneStreamStrategyError', err_1));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    OneStreamStrategy.prototype.addToAbortables = function (abortFunction) {
        this.abortables.push({ abort: abortFunction });
    };
    OneStreamStrategy.prototype.abort = function () {
        this.emit(UploadStrategy_1.UploadEvents.Aborted);
        this.abortables.forEach(function (abortable) { return abortable.abort(); });
        this.removeAllListeners();
    };
    return OneStreamStrategy;
}(UploadStrategy_1.UploadStrategy));
exports.OneStreamStrategy = OneStreamStrategy;
function buildUrlFromContract(contract) {
    return "http://" + contract.farmer.address + ":" + contract.farmer.port + "/upload/link/" + contract.hash;
}
function cleanEventEmitters(emitters) {
    emitters.forEach(function (e) { return e.removeAllListeners(); });
}
function cleanStreams(streams) {
    cleanEventEmitters(streams);
    streams.forEach(function (s) {
        if (!s.destroyed) {
            s.destroy();
        }
    });
}
