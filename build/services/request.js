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
exports.sendShardToNode = exports.sendUploadExchangeReport = exports.addShardToFrame = exports.createEntryFromFrame = exports.createFrame = exports.getFileById = exports.getBucketById = exports.streamRequest = exports.INXTRequest = exports.request = void 0;
var url = __importStar(require("url"));
var https = __importStar(require("https"));
var stream_1 = require("stream");
var http_1 = require("http");
var axios_1 = __importDefault(require("axios"));
var crypto_1 = require("../lib/crypto");
var proxy_1 = require("./proxy");
var INXT_API_URL = process.env.INXT_API_URL;
var Methods;
(function (Methods) {
    Methods["Get"] = "GET";
    Methods["Post"] = "POST";
})(Methods || (Methods = {}));
// abstract class Client<K> {
//   abstract request(config: EnvironmentConfig, method: Methods, url: string, params: any, useProxy: boolean): Promise<K>;
// }
// class AxiosClient implements Client<AxiosResponse> {
//   async request(config: EnvironmentConfig, method: Methods, targetUrl: string, params: any, useProxy: boolean) {
//     let reqUrl = targetUrl;
//     let proxy: ProxyManager;
//     if (useProxy) {
//       proxy = await getProxy();
//       reqUrl = `${proxy.url}/${url}`;
//     }
//     const DefaultOptions: AxiosRequestConfig = {
//       method,
//       auth: {
//         username: config.bridgeUser,
//         password: sha256(Buffer.from(config.bridgePass)).toString('hex')
//       },
//       url: reqUrl,
//       maxContentLength: Infinity
//     };
//     const options = { ...DefaultOptions, ...params };
//     return axios.request<JSON>(options).then((value) => {
//       if (useProxy && proxy) { proxy.free(); }
//       return value;
//     });
//   }
// }
// function createClient<K>(type: string): Client<K> {
//   let c = new AxiosClient();
//   return c;
// }
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
var INXTRequest = /** @class */ (function () {
    function INXTRequest(config, method, targetUrl, useProxy) {
        this.streaming = false;
        this.method = method;
        this.config = config;
        this.targetUrl = targetUrl;
        this.useProxy = useProxy !== null && useProxy !== void 0 ? useProxy : false;
        this.cancel = function () { return null; };
    }
    INXTRequest.prototype.start = function (params) {
        // TODO: Abstract from axios
        var source = axios_1.default.CancelToken.source();
        var cancelToken = source.token;
        this.req = request(this.config, this.method, this.targetUrl, __assign(__assign({}, params), { cancelToken: cancelToken }), this.useProxy).then(function (res) { return res.data; });
        return this.req;
    };
    INXTRequest.prototype.stream = function (content, options) {
        return __awaiter(this, void 0, void 0, function () {
            var proxy, targetUrl, uriParts, stream_2, stream;
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
                        uriParts = url.parse(targetUrl);
                        this.req = https.request(__assign(__assign({}, options), { method: this.method, protocol: uriParts.protocol, hostname: uriParts.hostname, port: uriParts.port, path: uriParts.path }));
                        if (this.method === Methods.Get && content instanceof stream_1.Writable) {
                            stream_2 = this.req.pipe(content);
                            return [2 /*return*/, new Promise(function (resolve, reject) {
                                    stream_2.on('error', reject);
                                    stream_2.on('end', function (x) {
                                        proxy === null || proxy === void 0 ? void 0 : proxy.free();
                                        resolve(x);
                                    });
                                })];
                        }
                        stream = content.pipe(this.req);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var chunks = '';
                                stream.on('data', function (chunk) { chunks += chunk; });
                                stream.on('end', function () {
                                    proxy === null || proxy === void 0 ? void 0 : proxy.free();
                                    console.log('END', JSON.parse(chunks));
                                    resolve(JSON.parse(chunks));
                                });
                                stream.on('abort', reject);
                                stream.on('error', reject);
                                stream.on('timeout', reject);
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
    return INXTRequest;
}());
exports.INXTRequest = INXTRequest;
function streamRequest(targetUrl, nodeID, useProxy, timeoutSeconds) {
    if (useProxy === void 0) { useProxy = true; }
    return __awaiter(this, void 0, void 0, function () {
        function _createDownloadStream() {
            return https.get({
                protocol: uriParts.protocol,
                hostname: uriParts.hostname,
                port: uriParts.port,
                path: uriParts.path,
                headers: {
                    'content-type': 'application/octet-stream',
                    'x-storj-node-id': nodeID
                }
            });
        }
        var proxy, reqUrl, uriParts, downloader;
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
                    console.log('Stream req (using proxy %s) to %s', useProxy, reqUrl);
                    uriParts = url.parse(reqUrl);
                    downloader = null;
                    return [2 /*return*/, new stream_1.Readable({
                            read: function () {
                                var _this = this;
                                if (!downloader) {
                                    downloader = _createDownloadStream();
                                    if (timeoutSeconds) {
                                        downloader.setTimeout(timeoutSeconds * 1000, function () {
                                            downloader === null || downloader === void 0 ? void 0 : downloader.destroy(Error("Request timeouted after " + timeoutSeconds + " seconds"));
                                        });
                                    }
                                    if (useProxy && proxy) {
                                        proxy.free();
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
                        })];
            }
        });
    });
}
exports.streamRequest = streamRequest;
/**
 * Checks if a bucket exists given its id
 * @param config App config
 * @param bucketId
 * @param token
 * @param jwt JSON Web Token
 * @param params
 */
function getBucketById(config, bucketId, params) {
    var URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
    var targetUrl = URL + "/buckets/" + bucketId;
    var defParams = {
        headers: {
            'Content-Type': 'application/octet-stream',
        }
    };
    var finalParams = __assign(__assign({}, defParams), params);
    return new INXTRequest(config, Methods.Get, targetUrl, false);
}
exports.getBucketById = getBucketById;
/**
 * Checks if a file exists given its id and a bucketId
 * @param config App config
 * @param bucketId
 * @param fileId
 * @param jwt JSON Web Token
 * @param params
 */
function getFileById(config, bucketId, fileId, params) {
    var URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
    var targetUrl = URL + "/buckets/" + bucketId + "/file-ids/" + fileId;
    var defParams = {
        headers: {
            'Content-Type': 'application/octet-stream',
        }
    };
    var finalParams = __assign(__assign({}, defParams), params);
    return request(config, 'get', targetUrl, finalParams, false)
        .then(function (res) { return res.data; });
}
exports.getFileById = getFileById;
/**
 * Creates a file staging frame
 * @param config App config
 * @param params
 */
function createFrame(config, params) {
    var URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
    var targetUrl = URL + "/frames";
    var defParams = {
        headers: {
            'Content-Type': 'application/octet-stream',
        }
    };
    var finalParams = __assign(__assign({}, defParams), params);
    return new INXTRequest(config, Methods.Post, targetUrl, false);
}
exports.createFrame = createFrame;
/**
 * Creates a bucket entry from the given frame object
 * @param {EnvironmentConfig} config App config
 * @param {string} bucketId
 * @param {CreateEntryFromFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
function createEntryFromFrame(config, bucketId, body, params) {
    var URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
    var targetUrl = URL + "/buckets/" + bucketId + "/files";
    var defParams = {
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        data: body
    };
    var finalParams = __assign(__assign({}, defParams), params);
    return request(config, 'post', targetUrl, finalParams, false)
        .then(function (res) { return res.data; })
        .catch(function (err) {
        if (err.response && err.response.data.error.includes('duplicate key') && parseInt(err.response.status, 10) === 500) {
            throw new Error('File already exists');
        }
    });
}
exports.createEntryFromFrame = createEntryFromFrame;
/**
 * Negotiates a storage contract and adds the shard to the frame
 * @param {EnvironmentConfig} config App config
 * @param {string} frameId
 * @param {AddShardToFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
function addShardToFrame(config, frameId, body, params) {
    var URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
    var targetUrl = URL + "/frames/" + frameId;
    var defParams = {
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        data: __assign(__assign({}, body), { challenges: body.challenges_as_str })
    };
    var finalParams = __assign(__assign({}, defParams), params);
    return request(config, 'put', targetUrl, finalParams, false)
        .then(function (res) { return res.data; });
}
exports.addShardToFrame = addShardToFrame;
/**
 * Sends an upload exchange report
 * @param config App config
 * @param body
 */
function sendUploadExchangeReport(config, exchangeReport) {
    return exchangeReport.sendReport();
}
exports.sendUploadExchangeReport = sendUploadExchangeReport;
/**
 * Stores a shard in a node
 * @param config App config
 * @param shard Interface that has the contact info
 * @param content Buffer with shard content
 */
function sendShardToNode(config, shard) {
    var targetUrl = "http://" + shard.farmer.address + ":" + shard.farmer.port + "/shards/" + shard.hash + "?token=" + shard.token;
    return new INXTRequest(config, Methods.Post, targetUrl, true);
}
exports.sendShardToNode = sendShardToNode;
