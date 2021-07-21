"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadShard = exports.DownloadShardRequest = void 0;
var fileinfo_1 = require("./fileinfo");
var reports_1 = require("./reports");
var api = __importStar(require("../services/request"));
var hashstream_1 = require("../lib/hashstream");
var crypto_1 = require("../lib/crypto");
function DownloadShardRequest(config, address, port, hash, token, nodeID) {
    var fetchUrl = "http://" + address + ":" + port + "/shards/" + hash + "?token=" + token;
    return api.streamRequest(fetchUrl, nodeID, true, 15);
}
exports.DownloadShardRequest = DownloadShardRequest;
function DownloadShard(config, shard, bucketId, fileId, excludedNodes) {
    if (excludedNodes === void 0) { excludedNodes = []; }
    return __awaiter(this, void 0, void 0, function () {
        var hasher, exchangeReport, shardBinary, outputStream, finalShardHash, anotherMirror;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hasher = new hashstream_1.HashStream(shard.size);
                    exchangeReport = new reports_1.ExchangeReport(config);
                    return [4 /*yield*/, DownloadShardRequest(config, shard.farmer.address, shard.farmer.port, shard.hash, shard.token, shard.farmer.nodeID)];
                case 1:
                    shardBinary = _a.sent();
                    outputStream = shardBinary.pipe(hasher);
                    return [4 /*yield*/, new Promise(function (resolve) {
                            hasher.on('end', function () { resolve(crypto_1.ripemd160(hasher.read()).toString('hex')); });
                        })];
                case 2:
                    finalShardHash = _a.sent();
                    exchangeReport.params.dataHash = finalShardHash;
                    exchangeReport.params.exchangeEnd = new Date();
                    exchangeReport.params.farmerId = shard.farmer.nodeID;
                    if (!(finalShardHash === shard.hash)) return [3 /*break*/, 3];
                    // console.log('Hash %s is OK', finalShardHash);
                    exchangeReport.DownloadOk();
                    // exchangeReport.sendReport()
                    return [2 /*return*/, outputStream];
                case 3:
                    console.error('Hash %s is WRONG', finalShardHash);
                    exchangeReport.DownloadError();
                    // exchangeReport.sendReport()
                    excludedNodes.push(shard.farmer.nodeID);
                    return [4 /*yield*/, fileinfo_1.GetFileMirror(config, bucketId, fileId, 1, shard.index, excludedNodes)];
                case 4:
                    anotherMirror = _a.sent();
                    if (!anotherMirror[0].farmer) {
                        throw Error('File missing shard error');
                    }
                    else {
                        return [2 /*return*/, DownloadShard(config, anotherMirror[0], bucketId, fileId, excludedNodes)];
                    }
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.DownloadShard = DownloadShard;
