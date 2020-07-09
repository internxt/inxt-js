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
var fileinfo_1 = require("../api/fileinfo");
var crypto_1 = require("./crypto");
var async_1 = require("async");
var shard_1 = require("../api/shard");
function Download(config, bucketId, fileId) {
    return __awaiter(this, void 0, void 0, function () {
        var fileInfo, fileShards, index, fileKey, shards, binary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.encryptionKey) {
                        throw Error('Encryption key required');
                    }
                    return [4 /*yield*/, fileinfo_1.GetFileInfo(config, bucketId, fileId)];
                case 1:
                    fileInfo = _a.sent();
                    return [4 /*yield*/, fileinfo_1.GetFileMirrors(config, bucketId, fileId)];
                case 2:
                    fileShards = _a.sent();
                    console.log('File Shards', fileShards);
                    index = Buffer.from(fileInfo.index, 'hex');
                    return [4 /*yield*/, crypto_1.GenerateFileKey(config.encryptionKey, bucketId, index)];
                case 3:
                    fileKey = _a.sent();
                    shards = [];
                    return [4 /*yield*/, new Promise(function (resolve) {
                            var globalHash = crypto_1.sha512HmacBuffer(fileKey);
                            async_1.eachSeries(fileShards, function (shard, nextShard) {
                                shard_1.DownloadShard(shard).then(function (shardData) {
                                    var shardHash = crypto_1.sha256(shardData);
                                    var rpm = crypto_1.ripemd160(shardHash);
                                    globalHash.update(rpm);
                                    console.log('Shard hash', rpm.toString('hex'));
                                    shards.push(shardData);
                                    nextShard();
                                });
                            }, function () {
                                var finalGlobalHash = globalHash.digest();
                                console.log('FINAL HASH', finalGlobalHash.toString('hex'), finalGlobalHash.toString('hex') === fileInfo.hmac.value);
                                var nonParityChunk = fileShards.map(function (x) {
                                    return x.parity ? Buffer.alloc(0) : shards[x.index];
                                });
                                var nonParityFile = Buffer.concat(nonParityChunk);
                                var fileDecipher = crypto_1.Aes256ctrDecrypter(fileKey.slice(0, 32), index.slice(0, 16));
                                var decrypted = Buffer.concat([fileDecipher.update(nonParityFile), fileDecipher.final()]);
                                resolve(decrypted);
                            });
                        })];
                case 4:
                    binary = _a.sent();
                    return [2 /*return*/, {
                            name: fileInfo.filename,
                            data: binary
                        }];
            }
        });
    });
}
exports.default = Download;
