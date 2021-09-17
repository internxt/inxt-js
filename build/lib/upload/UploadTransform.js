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
exports.UploadTransform = void 0;
var https_1 = require("https");
var stream_1 = require("stream");
var url_1 = require("url");
var Pusher = /** @class */ (function () {
    function Pusher(req) {
        this.packets = [];
        this.interval = setTimeout(function () { }, 0);
        this.id = Math.trunc(Math.random() * 2000);
        this.passthrough = new stream_1.PassThrough();
        this.stillSendingPackets = false;
        this.req = req;
        this.passthrough.pipe(this.req.request);
    }
    Pusher.prototype.init = function () {
        this.startPushing();
    };
    Pusher.prototype.startPushing = function () {
        var _this = this;
        this.interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var _loop_1, this_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.packets.length > 0)) return [3 /*break*/, 4];
                        this.stillSendingPackets = true;
                        this.pausePushing();
                        _loop_1 = function () {
                            var packet, r;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        packet = this_1.packets.shift();
                                        r = stream_1.Readable.from(packet);
                                        r.pipe(this_1.passthrough, { end: false });
                                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                                r.on('end', resolve);
                                                r.on('error', reject);
                                            })];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!(this.packets.length > 0)) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        // console.log('stillSending packets finished');
                        this.stillSendingPackets = false;
                        this.startPushing();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); }, 10);
    };
    Pusher.prototype.pausePushing = function () {
        clearInterval(this.interval);
    };
    Pusher.prototype.end = function () {
        var _this = this;
        var endWatcher = setInterval(function () {
            if (_this.stillSendingPackets) {
                return;
            }
            _this.req.request.once('end', function () {
                console.log('request end!!');
            });
            _this.req.request.end();
            stream_1.Readable.from(Buffer.alloc(0)).pipe(_this.passthrough).on('end', function () {
                console.log('request ended here');
            });
            clearInterval(endWatcher);
        }, 100);
    };
    Pusher.prototype.attach = function (b) {
        this.packets.push(b);
    };
    return Pusher;
}());
// tslint:disable-next-line: max-classes-per-file
var UploadTransform = /** @class */ (function (_super) {
    __extends(UploadTransform, _super);
    function UploadTransform(shardUploadTasks, totalTasks, options) {
        var _this = _super.call(this, options) || this;
        _this.requests = [];
        _this.currentShardIndex = 0;
        _this.currentShardBytes = 0;
        _this.shardUploadTasks = shardUploadTasks;
        var endInterval = setInterval(function () {
            if (shardUploadTasks.filter(function (t) { return t.finished; }).length === totalTasks) {
                console.log('tasks ended');
                _this.emit('tasks-end');
                clearInterval(endInterval);
            }
        }, 100);
        return _this;
    }
    UploadTransform.prototype._transform = function (chunk, enc, done) {
        // console.log('chunk', chunk.length);
        var _this = this;
        var task = this.shardUploadTasks.find(function (t) { return t.meta.index === _this.currentShardIndex; });
        if (!task) {
            done(new Error('Contract not found for shard index ' + this.currentShardIndex));
        }
        // console.log('currentShardBytes %s', this.currentShardBytes);
        var bytesToRefill = task.meta.size - this.currentShardBytes;
        var contentToSendNow = chunk;
        if (bytesToRefill <= chunk.length) {
            // console.log('bytesToRefill %s', bytesToRefill);
            this.pushContent(chunk.slice(0, bytesToRefill), this.currentShardIndex);
            this.requests[this.currentShardIndex].pusher.end();
            this.currentShardIndex++;
            this.currentShardBytes = 0;
            contentToSendNow = chunk.slice(bytesToRefill);
        }
        if (bytesToRefill !== chunk.length) {
            this.pushContent(contentToSendNow, this.currentShardIndex);
        }
        done(null);
    };
    UploadTransform.prototype._flush = function (cb) {
        cb(null);
    };
    UploadTransform.prototype.pushContent = function (chunk, shardIndex) {
        var _this = this;
        var task = this.shardUploadTasks.find(function (t) { return t.meta.index === shardIndex; });
        var maybeRequest = this.requests.find(function (r) { return r.index === shardIndex; });
        if (!maybeRequest) {
            // console.log('creating request');
            var req_1 = this.createRequest(this.currentShardIndex, new url_1.URL(buildUrlFromContract(task.contract)));
            this.requests.push(req_1);
            req_1.pusher.attach(chunk);
            req_1.pusher.init();
            req_1.request.once('finish', function () {
                // console.log('request enddddd');
                _this.emit('task-processed');
                req_1.request.removeAllListeners();
                task.finished = true;
            });
        }
        else {
            maybeRequest.pusher.attach(chunk);
        }
        this.currentShardBytes += chunk.length;
    };
    UploadTransform.prototype.createRequest = function (index, url) {
        console.log(url.hostname);
        console.log(url.pathname);
        var req = https_1.request({
            protocol: 'https:',
            method: 'POST',
            hostname: url.hostname,
            path: url.pathname,
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        }, function (res) {
            var dataResponse = Buffer.alloc(0);
            res.on('error', function (err) {
                console.log('err', err);
            });
            res.on('data', function (d) {
                dataResponse = Buffer.concat([dataResponse, d]);
            });
            res.on('end', function () {
                console.log('https request end');
            });
        });
        var uploadRequest = { index: index, request: req };
        var pusher = new Pusher(uploadRequest);
        return { index: index, request: req, pusher: pusher };
    };
    return UploadTransform;
}(stream_1.Transform));
exports.UploadTransform = UploadTransform;
function buildUrlFromContract(contract) {
    return "https://proxy02.api.internxt.com/http://" + contract.farmer.address + ":" + contract.farmer.port + "/shards/" + contract.hash + "?token=" + contract.token;
}
