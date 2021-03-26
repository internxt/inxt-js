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
exports.getProxy = exports.Proxy = exports.ProxyBalancer = void 0;
var crypto_1 = require("crypto");
var mutex_1 = require("../lib/utils/mutex");
var wait = function (ms) { return new Promise(function (res) { return setTimeout(res, ms); }); };
var MAX_CONCURRENT_BROWSER_CONNECTIONS = 6;
var ProxyBalancer = /** @class */ (function () {
    function ProxyBalancer() {
        this.proxies = [];
    }
    ProxyBalancer.prototype.getProxy = function (reqsLessThan) {
        return __awaiter(this, void 0, void 0, function () {
            var proxiesCopy, proxiesAvailable;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        proxiesCopy = __spreadArrays(this.proxies);
                        _a.label = 1;
                    case 1:
                        if (!((proxiesAvailable = proxiesCopy.filter(function (proxy) { return proxy.requests() < reqsLessThan; })).length === 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, wait(500)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/, proxiesAvailable[0]];
                }
            });
        });
    };
    ProxyBalancer.prototype.attach = function (p) {
        this.proxies.push(p);
        return this;
    };
    ProxyBalancer.prototype.del = function (p) {
        this.proxies = this.proxies.filter(function (proxy) { return proxy.url !== p.url; });
    };
    return ProxyBalancer;
}());
exports.ProxyBalancer = ProxyBalancer;
var Proxy = /** @class */ (function () {
    function Proxy(url) {
        this.url = url;
        this.currentRequests = [];
    }
    Proxy.prototype.requests = function () {
        return this.currentRequests.length;
    };
    Proxy.prototype.addReq = function (p) {
        this.currentRequests.push(p);
    };
    Proxy.prototype.removeReq = function (p) {
        this.currentRequests = this.currentRequests.filter(function (req) { return req.id !== p.id; });
    };
    return Proxy;
}());
exports.Proxy = Proxy;
// const proxyBalancer = new ProxyBalancer()
//     .attach(new Proxy('https://proxy1.internxt.com'))
//     .attach(new Proxy('https://proxy2.internxt.com'))
//     .attach(new Proxy('https://proxy3.internxt.com'))
//     .attach(new Proxy('https://proxy4.internxt.com'))
//     .attach(new Proxy('https://proxy5.internxt.com'))
var proxyBalancer = new ProxyBalancer()
    .attach(new Proxy('https://api.internxt.com:8081'));
var mutex = new mutex_1.Mutex();
exports.getProxy = function () { return __awaiter(void 0, void 0, void 0, function () {
    var response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                response = __assign(__assign({}, new Proxy('')), { free: function () { null; } });
                return [4 /*yield*/, mutex.dispatch(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var proxy, proxyReq;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, proxyBalancer.getProxy(MAX_CONCURRENT_BROWSER_CONNECTIONS)];
                                case 1:
                                    proxy = _a.sent();
                                    proxyReq = { id: crypto_1.randomBytes(30).toString('hex') };
                                    proxy.addReq(proxyReq);
                                    response = __assign(__assign({}, proxy), { free: function () { return proxy.removeReq(proxyReq); } });
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 1:
                _a.sent();
                return [2 /*return*/, response];
        }
    });
}); };
