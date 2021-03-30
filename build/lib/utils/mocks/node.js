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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = exports.CaseNotImplementedError = exports.NodeRequestHeaders = exports.NodeResponse = exports.NodeRequest = exports.NodeMock = void 0;
var stream_1 = require("stream");
var crypto_1 = require("crypto");
var http_1 = require("./http");
var NodeMock = /** @class */ (function () {
    function NodeMock(port, path, ID, hostname) {
        this.port = port;
        this.path = path;
        this.ID = ID;
        this.hostname = hostname;
        this._nodeResponse = new NodeResponse(true, 200, 'response', 8);
        this._shard = stream_1.Readable.from('');
    }
    Object.defineProperty(NodeMock.prototype, "shard", {
        set: function (s) {
            this._shard = this.shard;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(NodeMock.prototype, "nodeResponse", {
        set: function (nr) {
            this._nodeResponse = nr;
        },
        enumerable: false,
        configurable: true
    });
    NodeMock.prototype.get = function (nr) {
        return this._nodeResponse;
    };
    NodeMock.prototype.send = function (shardStream) {
        return Promise.resolve(this._nodeResponse);
    };
    return NodeMock;
}());
exports.NodeMock = NodeMock;
var NodeRequest = /** @class */ (function () {
    function NodeRequest(hostname, path, port, headers, token, shardHash) {
        this.protocol = 'http'; // use always http
        this.port = port;
        this.hostname = hostname;
        this.path = path;
        this.headers = headers;
        this.token = token;
        this.url = this.protocol + "://" + hostname + ":" + port + "/shards/" + shardHash + "?token=" + token;
    }
    return NodeRequest;
}());
exports.NodeRequest = NodeRequest;
var NodeResponse = /** @class */ (function () {
    function NodeResponse(status, statusCode, content, responseSize) {
        this.status = status;
        this.statusCode = statusCode;
        this.content = stream_1.Readable.from('');
        if (responseSize) {
            this.content = stream_1.Readable.from(crypto_1.randomBytes(responseSize));
        }
        else {
            if (content instanceof String) {
                this.content = stream_1.Readable.from(Buffer.from(content));
            }
        }
    }
    NodeResponse.prototype.on = function (event, cb) {
        this.content.on(event, function () { return cb; });
    };
    return NodeResponse;
}());
exports.NodeResponse = NodeResponse;
var NodeRequestHeaders = /** @class */ (function () {
    function NodeRequestHeaders(contentType, xStorjNodeId) {
        this.contentType = contentType;
        this.xStorjNodeId = xStorjNodeId;
    }
    return NodeRequestHeaders;
}());
exports.NodeRequestHeaders = NodeRequestHeaders;
var CaseNotImplementedError = /** @class */ (function (_super) {
    __extends(CaseNotImplementedError, _super);
    function CaseNotImplementedError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.message = 'Type not implemented yet';
        return _this;
    }
    return CaseNotImplementedError;
}(Error));
exports.CaseNotImplementedError = CaseNotImplementedError;
exports.generateResponse = function (type, statusSize) {
    switch (type) {
        case http_1.HTTPStatusCodes.OK:
            return new NodeResponse(true, type, '', statusSize);
        case http_1.HTTPStatusCodes.BAD_REQUEST:
            return new NodeResponse(false, type, '', statusSize);
        case http_1.HTTPStatusCodes.UNAUTHORIZED:
            return new NodeResponse(false, type, '', statusSize);
        case http_1.HTTPStatusCodes.NOT_FOUND:
            return new NodeResponse(false, type, '', statusSize);
        case http_1.HTTPStatusCodes.INTERNAL_SERVER_ERROR:
            return new NodeResponse(false, type, '', statusSize);
        default:
            throw new CaseNotImplementedError();
    }
};
