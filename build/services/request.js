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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = exports.authmethod = void 0;
var axios_1 = __importDefault(require("axios"));
var crypto_1 = require("../lib/crypto");
var AuthMethod = /** @class */ (function () {
    function AuthMethod() {
    }
    AuthMethod.BasicAuth = "1";
    return AuthMethod;
}());
function authmethod(authMethod) {
    if (authMethod === AuthMethod.BasicAuth) {
    }
}
exports.authmethod = authmethod;
function request(config, method, targetUrl, params, callback) {
    var DefaultOptions = {
        method: method,
        auth: {
            username: config.bridgeUser,
            password: crypto_1.sha256(Buffer.from(config.bridgePass)).toString('hex')
        },
        url: targetUrl
    };
    var options = __assign(__assign({}, DefaultOptions), params);
    return axios_1.default.request(options);
}
exports.request = request;
