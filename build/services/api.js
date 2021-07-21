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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bridge = exports.EmptyBridgeUrlError = void 0;
var request_1 = require("./request");
var Methods;
(function (Methods) {
    Methods["Get"] = "GET";
    Methods["Post"] = "POST";
    Methods["Put"] = "PUT";
})(Methods || (Methods = {}));
function emptyINXTRequest(config) {
    return new request_1.INXTRequest(config, Methods.Get, '', false);
}
var InxtApi = /** @class */ (function () {
    function InxtApi(config) {
        var _a;
        this.config = config;
        this.url = (_a = config.bridgeUrl) !== null && _a !== void 0 ? _a : '';
    }
    InxtApi.prototype.getBucketById = function (bucketId, params) {
        return emptyINXTRequest(this.config);
    };
    InxtApi.prototype.getFileById = function (bucketId, fileId, params) {
        return emptyINXTRequest(this.config);
    };
    InxtApi.prototype.createFrame = function (params) {
        return emptyINXTRequest(this.config);
    };
    InxtApi.prototype.createEntryFromFrame = function (bucketId, body, params) {
        return emptyINXTRequest(this.config);
    };
    InxtApi.prototype.addShardToFrame = function (frameId, body, params) {
        return emptyINXTRequest(this.config);
    };
    InxtApi.prototype.sendUploadExchangeReport = function (exchangeReport) {
        return exchangeReport.sendReport();
    };
    InxtApi.prototype.sendShardToNode = function (shard) {
        return emptyINXTRequest(this.config);
    };
    return InxtApi;
}());
// tslint:disable-next-line: max-classes-per-file
var EmptyBridgeUrlError = /** @class */ (function (_super) {
    __extends(EmptyBridgeUrlError, _super);
    function EmptyBridgeUrlError() {
        return _super.call(this, 'Empty bridge url') || this;
    }
    return EmptyBridgeUrlError;
}(Error));
exports.EmptyBridgeUrlError = EmptyBridgeUrlError;
// tslint:disable-next-line: max-classes-per-file
var Bridge = /** @class */ (function (_super) {
    __extends(Bridge, _super);
    function Bridge(config) {
        var _this = this;
        if (config.bridgeUrl === '') {
            throw new EmptyBridgeUrlError();
        }
        _this = _super.call(this, config) || this;
        return _this;
    }
    Bridge.prototype.getBucketById = function (bucketId, params) {
        var targetUrl = this.url + "/buckets/" + bucketId;
        var defParams = {
            headers: {
                'Content-Type': 'application/octet-stream',
            }
        };
        var finalParams = __assign(__assign({}, defParams), params);
        return new request_1.INXTRequest(this.config, Methods.Get, targetUrl, false);
    };
    Bridge.prototype.getFileById = function (bucketId, fileId, params) {
        var targetUrl = this.url + "/buckets/" + bucketId + "/file-ids/" + fileId;
        var defParams = {
            headers: {
                'Content-Type': 'application/octet-stream',
            }
        };
        var finalParams = __assign(__assign({}, defParams), params);
        return new request_1.INXTRequest(this.config, Methods.Get, targetUrl, false);
    };
    Bridge.prototype.createFrame = function (params) {
        var targetUrl = this.url + "/frames";
        var defParams = {
            headers: {
                'Content-Type': 'application/octet-stream',
            }
        };
        var finalParams = __assign(__assign({}, defParams), params);
        return new request_1.INXTRequest(this.config, Methods.Post, targetUrl, false);
    };
    Bridge.prototype.createEntryFromFrame = function (bucketId, body, params) {
        var targetUrl = this.url + "/buckets/" + bucketId + "/files";
        var defParams = {
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            data: body
        };
        var finalParams = __assign(__assign({}, defParams), params);
        return new request_1.INXTRequest(this.config, Methods.Post, targetUrl, false);
    };
    Bridge.prototype.addShardToFrame = function (frameId, body, params) {
        var targetUrl = this.url + "/frames/" + frameId;
        var defParams = {
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            data: __assign(__assign({}, body), { challenges: body.challenges_as_str })
        };
        var finalParams = __assign(__assign({}, defParams), params);
        return new request_1.INXTRequest(this.config, Methods.Put, targetUrl, false);
    };
    Bridge.prototype.sendUploadExchangeReport = function (exchangeReport) {
        return exchangeReport.sendReport();
    };
    Bridge.prototype.sendShardToNode = function (shard) {
        var targetUrl = "http://" + shard.farmer.address + ":" + shard.farmer.port + "/shards/" + shard.hash + "?token=" + shard.token;
        return new request_1.INXTRequest(this.config, Methods.Post, targetUrl, true);
    };
    return Bridge;
}(InxtApi));
exports.Bridge = Bridge;
