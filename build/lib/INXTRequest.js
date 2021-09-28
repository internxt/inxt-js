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
exports.INXTRequest = void 0;
var http_1 = require("http");
var events_1 = require("events");
var axios_1 = __importDefault(require("axios"));
var request_1 = require("../services/request");
var proxy_1 = require("../services/proxy");
var Methods;
(function (Methods) {
    Methods["Get"] = "GET";
    Methods["Post"] = "POST";
    Methods["Put"] = "PUT";
    Methods["Patch"] = "PATCH";
})(Methods || (Methods = {}));
var INXTRequest = /** @class */ (function (_super) {
    __extends(INXTRequest, _super);
    function INXTRequest(config, method, targetUrl, params, useProxy) {
        var _this = _super.call(this) || this;
        _this.streaming = false;
        _this.method = method;
        _this.config = config;
        _this.targetUrl = targetUrl;
        _this.useProxy = useProxy !== null && useProxy !== void 0 ? useProxy : false;
        _this.params = params;
        _this.cancel = function () { return null; };
        return _this;
    }
    INXTRequest.prototype.start = function () {
        // TODO: Abstract from axios
        var source = axios_1.default.CancelToken.source();
        this.cancel = source.cancel;
        var cancelToken = source.token;
        this.req = request_1.request(this.config, this.method, this.targetUrl, __assign(__assign({}, this.params), { cancelToken: cancelToken }), this.useProxy).then(function (res) { return res.data; });
        return this.req;
    };
    INXTRequest.prototype.stream = function (content, size) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (size) {
                    return [2 /*return*/, this.postStream(content, size)];
                }
                return [2 /*return*/, this.getStream()];
            });
        });
    };
    INXTRequest.prototype.getStream = function () {
        return __awaiter(this, void 0, void 0, function () {
            var proxy, targetUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.streaming = true;
                        if (!this.useProxy) return [3 /*break*/, 2];
                        return [4 /*yield*/, proxy_1.getProxy()];
                    case 1:
                        proxy = _a.sent();
                        _a.label = 2;
                    case 2:
                        targetUrl = "" + (proxy && proxy.url ? proxy.url + '/' : '') + this.targetUrl;
                        return [2 /*return*/, request_1.streamRequest(targetUrl)];
                }
            });
        });
    };
    INXTRequest.prototype.postStream = function (content, size) {
        return __awaiter(this, void 0, void 0, function () {
            var proxy, targetUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.streaming = true;
                        if (!this.useProxy) return [3 /*break*/, 2];
                        return [4 /*yield*/, proxy_1.getProxy()];
                    case 1:
                        proxy = _a.sent();
                        _a.label = 2;
                    case 2:
                        targetUrl = "" + (proxy && proxy.url ? proxy.url + '/' : '') + this.targetUrl;
                        return [2 /*return*/, axios_1.default.post(targetUrl, content, {
                                maxContentLength: Infinity,
                                headers: {
                                    'Content-Type': 'application/octet-stream',
                                    'Content-Length': size
                                }
                            }).then(function (res) {
                                proxy === null || proxy === void 0 ? void 0 : proxy.free();
                                return res;
                            })];
                }
            });
        });
    };
    INXTRequest.prototype.abort = function () {
        if (this.streaming && this.req instanceof http_1.ClientRequest) {
            return this.req.destroy();
        }
        this.cancel();
    };
    INXTRequest.prototype.isCancelled = function (err) {
        return axios_1.default.isCancel(err);
    };
    INXTRequest.Events = {
        UploadProgress: 'upload-progress',
        DownloadProgress: 'download-progress'
    };
    return INXTRequest;
}(events_1.EventEmitter));
exports.INXTRequest = INXTRequest;
