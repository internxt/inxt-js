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
exports.putStream = exports.getStream = exports.get = exports.httpsStreamPostRequest = exports.streamRequest = exports.request = void 0;
var url = __importStar(require("url"));
var https = __importStar(require("https"));
var http = __importStar(require("http"));
var stream_1 = require("stream");
var axios_1 = __importDefault(require("axios"));
var crypto_1 = require("../lib/crypto");
var proxy_1 = require("./proxy");
var needle_1 = __importDefault(require("needle"));
function request(config, method, targetUrl, params, useProxy) {
    if (useProxy === void 0) { useProxy = true; }
    return __awaiter(this, void 0, void 0, function () {
        var reqUrl, proxy, DefaultOptions, options;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reqUrl = targetUrl;
                    if (!useProxy) return [3 /*break*/, 2];
                    return [4 /*yield*/, proxy_1.getProxy()];
                case 1:
                    proxy = _a.sent();
                    reqUrl = proxy.url + "/" + targetUrl;
                    _a.label = 2;
                case 2:
                    DefaultOptions = {
                        method: method,
                        auth: {
                            username: config.bridgeUser,
                            password: crypto_1.sha256(Buffer.from(config.bridgePass)).toString('hex')
                        },
                        url: reqUrl,
                        maxContentLength: Infinity
                    };
                    options = __assign(__assign({}, DefaultOptions), params);
                    return [2 /*return*/, axios_1.default.request(options).then(function (value) {
                            if (useProxy && proxy) {
                                proxy.free();
                            }
                            return value;
                        })];
            }
        });
    });
}
exports.request = request;
function streamRequest(targetUrl, timeoutSeconds) {
    var uriParts = url.parse(targetUrl);
    var downloader = null;
    function _createDownloadStream() {
        var requestOpts = {
            protocol: uriParts.protocol,
            hostname: uriParts.hostname,
            port: uriParts.port,
            path: uriParts.path,
            headers: {
                'content-type': 'application/octet-stream'
            }
        };
        return uriParts.protocol === 'http:' ? http.get(requestOpts) : https.get(requestOpts);
    }
    return new stream_1.Readable({
        read: function () {
            var _this = this;
            if (!downloader) {
                downloader = _createDownloadStream();
                if (timeoutSeconds) {
                    downloader.setTimeout(timeoutSeconds * 1000, function () {
                        downloader === null || downloader === void 0 ? void 0 : downloader.destroy(Error("Request timeouted after " + timeoutSeconds + " seconds"));
                    });
                }
                downloader.on('response', function (res) {
                    res
                        .on('data', _this.push.bind(_this))
                        .on('error', _this.emit.bind(_this, 'error'))
                        .on('end', function () {
                        _this.push.bind(_this, null);
                        _this.emit('end');
                    }).on('close', _this.emit.bind(_this, 'close'));
                })
                    .on('error', this.emit.bind(this, 'error'))
                    .on('timeout', function () { return _this.emit('error', Error('Request timeout')); });
            }
        }
    });
}
exports.streamRequest = streamRequest;
function httpsStreamPostRequest(params, useProxy) {
    if (useProxy === void 0) { useProxy = true; }
    return __awaiter(this, void 0, void 0, function () {
        var targetUrl, free, proxy, reqUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    targetUrl = params.hostname;
                    if (!useProxy) return [3 /*break*/, 2];
                    return [4 /*yield*/, proxy_1.getProxy()];
                case 1:
                    proxy = _a.sent();
                    targetUrl = proxy.url + "/" + params.hostname;
                    free = proxy.free;
                    _a.label = 2;
                case 2:
                    reqUrl = new url.URL(targetUrl);
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            var req = https.request({
                                protocol: 'https:',
                                method: 'POST',
                                hostname: reqUrl.hostname,
                                path: reqUrl.pathname,
                                headers: {
                                    'Content-Type': 'application/octet-stream'
                                }
                            }, function (res) {
                                var dataResponse = Buffer.alloc(0);
                                res.on('error', function (err) {
                                    if (free) {
                                        free();
                                    }
                                    reject(err);
                                });
                                res.on('data', function (d) {
                                    dataResponse = Buffer.concat([dataResponse, d]);
                                });
                                res.on('end', function () {
                                    if (free) {
                                        free();
                                    }
                                    if (res.statusCode && res.statusCode > 399) {
                                        return reject(new Error(dataResponse.toString()));
                                    }
                                    resolve(dataResponse);
                                });
                            });
                            params.source.pipe(req);
                        })];
            }
        });
    });
}
exports.httpsStreamPostRequest = httpsStreamPostRequest;
function get(url, config) {
    if (config === void 0) { config = { useProxy: false }; }
    return __awaiter(this, void 0, void 0, function () {
        var targetUrl, free, proxy;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    targetUrl = url;
                    if (!config.useProxy) return [3 /*break*/, 2];
                    return [4 /*yield*/, proxy_1.getProxy()];
                case 1:
                    proxy = _a.sent();
                    free = proxy.free;
                    targetUrl = proxy.url + "/" + targetUrl;
                    _a.label = 2;
                case 2: return [2 /*return*/, axios_1.default.get(targetUrl).then(function (res) {
                        if (free) {
                            free();
                        }
                        return res.data;
                    })];
            }
        });
    });
}
exports.get = get;
function getStream(url, config) {
    if (config === void 0) { config = { useProxy: false }; }
    return __awaiter(this, void 0, void 0, function () {
        var targetUrl, free, proxy;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    targetUrl = url;
                    if (!(config.useProxy || process.env.NODE_ENV !== 'production' || true)) return [3 /*break*/, 2];
                    return [4 /*yield*/, proxy_1.getProxy()];
                case 1:
                    proxy = _a.sent();
                    free = proxy.free;
                    targetUrl = proxy.url + "/" + targetUrl;
                    _a.label = 2;
                case 2: return [2 /*return*/, streamRequest(targetUrl)];
            }
        });
    });
}
exports.getStream = getStream;
function putStream(url, content, config, controller) {
    if (config === void 0) { config = { useProxy: false }; }
    return __awaiter(this, void 0, void 0, function () {
        var targetUrl, free, proxy, postReq, responseBuffers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    targetUrl = url;
                    if (!config.useProxy) return [3 /*break*/, 2];
                    return [4 /*yield*/, proxy_1.getProxy()];
                case 1:
                    proxy = _a.sent();
                    free = proxy.free;
                    targetUrl = proxy.url + "/" + targetUrl;
                    _a.label = 2;
                case 2:
                    postReq = needle_1.default.put(targetUrl, content);
                    responseBuffers = [];
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            postReq.on('data', function (c) {
                                responseBuffers.push(c);
                            });
                            postReq.once('error', reject);
                            postReq.once('end', function () {
                                console.log('RES', Buffer.concat(responseBuffers).toString());
                                resolve(null);
                            });
                        })];
            }
        });
    });
}
exports.putStream = putStream;
