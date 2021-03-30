"use strict";
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
exports.MirrorMock = void 0;
var reports_1 = require("../../../../api/reports");
var hashstream_1 = require("../../../hashstream");
var http_1 = require("../http");
var node_1 = require("../node");
var exchangeReport_1 = require("./exchangeReport");
var crypto_1 = require("../../../crypto");
var MirrorMock = /** @class */ (function () {
    function MirrorMock(node, bridge) {
        this._node = node;
        this._bridge = bridge;
    }
    MirrorMock.prototype.DownloadShardRequest = function (config, address, port, hash, token, nodeID) {
        var nh = new node_1.NodeRequestHeaders(http_1.ContentType.OCTET_STREAM, nodeID);
        var nr = new node_1.NodeRequest(address, '/shards', 3000, nh, token, hash);
        return this._node.get(nr).content;
    };
    MirrorMock.prototype.DownloadShard = function (config, shard, bucketId, fileId, excludedNodes) {
        if (excludedNodes === void 0) { excludedNodes = []; }
        return __awaiter(this, void 0, void 0, function () {
            var hasher, exchangeReportMock, shardBinary, outputStream, finalShardHash, otherMirrorResponse, maybeOtherMirror;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        hasher = new hashstream_1.HashStream(shard.size);
                        exchangeReportMock = new exchangeReport_1.ExchangeReportMock(new reports_1.ExchangeReport(config));
                        shardBinary = this.DownloadShardRequest(config, shard.farmer.address, shard.farmer.port, shard.hash, shard.token, shard.farmer.nodeID);
                        outputStream = shardBinary.pipe(hasher);
                        return [4 /*yield*/, new Promise(function (resolve) {
                                hasher.on('end', function () { resolve(crypto_1.ripemd160(hasher.read()).toString('hex')); });
                            })];
                    case 1:
                        finalShardHash = _a.sent();
                        exchangeReportMock.exchangeReport.params.dataHash = finalShardHash;
                        exchangeReportMock.exchangeReport.params.exchangeEnd = new Date();
                        exchangeReportMock.exchangeReport.params.farmerId = shard.farmer.nodeID;
                        if (!(finalShardHash === shard.hash)) return [3 /*break*/, 2];
                        exchangeReportMock.DownloadOk();
                        return [2 /*return*/, outputStream];
                    case 2:
                        exchangeReportMock.DownloadError();
                        excludedNodes.push(shard.farmer.nodeID);
                        return [4 /*yield*/, this._bridge.GetFileMirror(config, bucketId, fileId, 1, shard.index, excludedNodes)];
                    case 3:
                        otherMirrorResponse = _a.sent();
                        maybeOtherMirror = otherMirrorResponse[0];
                        if (!maybeOtherMirror) {
                            throw new Error('File missing shard error');
                        }
                        else {
                            return [2 /*return*/, this.DownloadShard(config, maybeOtherMirror, bucketId, fileId, excludedNodes)];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MirrorMock.prototype.UploadShard = function (node, shardStream) {
        return __awaiter(this, void 0, void 0, function () {
            var nr, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, node.send(shardStream)];
                    case 1:
                        nr = _a.sent();
                        return [2 /*return*/, nr.status && nr.statusCode === 200];
                    case 2:
                        e_1 = _a.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return MirrorMock;
}());
exports.MirrorMock = MirrorMock;
