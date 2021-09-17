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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardObject = void 0;
var events_1 = require("events");
var error_1 = require("../lib/utils/error");
var logger_1 = require("../lib/utils/logger");
var request_1 = require("../services/request");
var ShardObject = /** @class */ (function (_super) {
    __extends(ShardObject, _super);
    function ShardObject(api, frameId, meta, shard) {
        var _this = _super.call(this) || this;
        _this.requests = [];
        // TODO: Clarify if meta and shard variables are both required.
        _this.frameId = frameId !== null && frameId !== void 0 ? frameId : '';
        _this.meta = meta !== null && meta !== void 0 ? meta : {
            hash: '',
            index: 0,
            parity: false,
            challenges_as_str: [],
            size: 0,
            tree: [],
            challenges: [],
            exclude: []
        };
        _this.api = api;
        _this.shard = shard;
        return _this;
    }
    Object.defineProperty(ShardObject.prototype, "size", {
        get: function () {
            return this.meta.size;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ShardObject.prototype, "hash", {
        get: function () {
            return this.meta.hash;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ShardObject.prototype, "index", {
        get: function () {
            return this.meta.index;
        },
        enumerable: false,
        configurable: true
    });
    ShardObject.prototype.upload = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var contract, farmer, shard;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.frameId) {
                            throw new Error('Frame id not provided');
                        }
                        return [4 /*yield*/, this.negotiateContract()];
                    case 1:
                        contract = _a.sent();
                        logger_1.logger.debug('Negotiated succesfully contract for shard %s (index %s, size %s) with token %s', this.hash, this.index, this.size, contract.token);
                        farmer = __assign(__assign({}, contract.farmer), { lastSeen: new Date() });
                        shard = {
                            index: this.index,
                            replaceCount: 0,
                            hash: this.hash,
                            size: this.size,
                            parity: this.meta.parity,
                            token: contract.token,
                            farmer: farmer,
                            operation: contract.operation
                        };
                        return [4 /*yield*/, this.sendShardToNode(content, shard)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, this.meta];
                }
            });
        });
    };
    ShardObject.requestPut = function (url) {
        return request_1.get(url, { useProxy: true }).then(function (res) { return res.result; });
    };
    ShardObject.putStream = function (url, content) {
        return request_1.putStream(url, content);
    };
    ShardObject.prototype.negotiateContract = function () {
        var req = this.api.addShardToFrame(this.frameId, this.meta);
        this.requests.push(req);
        return req.start()
            .catch(function (err) {
            throw error_1.wrap('Contract negotiation error', err);
        });
    };
    ShardObject.prototype.sendShardToNode = function (content, shard) {
        var _this = this;
        var req = this.api.sendShardToNode(shard, content);
        this.requests.push(req);
        var success = true;
        return req.start()
            .catch(function (err) {
            if (err.response && err.response.status < 400) {
                return { result: err.response.data && err.response.data.error };
            }
            success = false;
            throw error_1.wrap('Farmer request error', err);
        }).finally(function () {
            var hash = shard.hash;
            var nodeID = shard.farmer.nodeID;
            _this.emit(ShardObject.Events.NodeTransferFinished, { hash: hash, nodeID: nodeID, success: success });
        });
    };
    ShardObject.prototype.abort = function () {
        this.requests.forEach(function (r) {
            r.abort();
        });
    };
    ShardObject.prototype.download = function () {
        if (!this.shard) {
            throw new Error('Provide shard info before trying to download a shard');
        }
        var req = this.api.getShardFromNode(this.shard);
        this.requests.push(req);
        return req.stream();
    };
    ShardObject.Events = {
        NodeTransferFinished: 'node-transfer-finished'
    };
    return ShardObject;
}(events_1.EventEmitter));
exports.ShardObject = ShardObject;
