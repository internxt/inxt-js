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
exports.Upload = void 0;
var FileObjectUpload_1 = require("../../api/FileObjectUpload");
var logger_1 = require("../utils/logger");
var rs_wrapper_1 = require("rs-wrapper");
var MIN_SHARD_SIZE = 2097152; // 2Mb
/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
function Upload(config, bucketId, fileMeta, progress, finish) {
    var _this = this;
    if (!config.encryptionKey) {
        throw new Error('Encryption key is null');
    }
    var File = new FileObjectUpload_1.FileObjectUpload(config, fileMeta, bucketId);
    var fileContent = Buffer.alloc(0);
    var fileSize = 0;
    File.init().then(function () { return File.StartUploadFile(); }).then(function (out) {
        return new Promise(function (resolve, reject) {
            var totalBytes = fileMeta.size;
            var uploadedBytes = 0;
            var progressCounter = 0;
            var uploadShardPromises = [];
            progress(0, uploadedBytes, totalBytes);
            out.on('data', function (encryptedShard) { return __awaiter(_this, void 0, void 0, function () {
                var rawShard, size, index;
                return __generator(this, function (_a) {
                    fileContent = Buffer.concat([fileContent, encryptedShard]);
                    rawShard = out.shards.pop();
                    // TODO: Review this message and if is required
                    if (!rawShard) {
                        return [2 /*return*/, reject('File content is empty')];
                    }
                    size = rawShard.size, index = rawShard.index;
                    fileSize += size;
                    if (size !== encryptedShard.length) {
                        return [2 /*return*/, reject("shard size calculated " + size + " and encrypted shard size " + encryptedShard.length + " do not match")];
                    }
                    return [2 /*return*/];
                });
            }); });
            out.on('error', reject);
            out.on('end', function () { return __awaiter(_this, void 0, void 0, function () {
                var shardSize, nShards, parityShards, from, currentIndex, currentShard, totalSize, sendShard, i, fileEncoded, parities, i, uploadShardResponses, bucketEntry, savingFileResponse, err_1;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            shardSize = rs_wrapper_1.utils.determineShardSize(fileSize);
                            nShards = Math.ceil(fileSize / shardSize);
                            parityShards = rs_wrapper_1.utils.determineParityShards(nShards);
                            console.log('Shards obtained %s, shardSize %s', nShards, shardSize);
                            from = 0;
                            currentIndex = 0;
                            currentShard = null;
                            totalSize = fileSize;
                            if (fileSize >= MIN_SHARD_SIZE) {
                                totalSize += parityShards * shardSize;
                            }
                            sendShard = function (encryptedShard, index, isParity) { return __awaiter(_this, void 0, void 0, function () {
                                var response;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, File.UploadShard(encryptedShard, encryptedShard.length, File.frameId, index, 3, isParity)];
                                        case 1:
                                            response = _a.sent();
                                            uploadedBytes += encryptedShard.length;
                                            progressCounter += (encryptedShard.length / totalSize) * 100;
                                            console.log('Upload bytes %s (%s)', uploadedBytes, progressCounter);
                                            progress(progressCounter, uploadedBytes, totalSize);
                                            return [2 /*return*/, response];
                                    }
                                });
                            }); };
                            // upload content
                            for (i = 0; i < nShards; i++, currentIndex++, from += shardSize) {
                                currentShard = fileContent.slice(from, from + shardSize);
                                console.log("Uploading std shard with size %s, index %s", currentShard.length, currentIndex);
                                uploadShardPromises.push(sendShard(currentShard, currentIndex, false));
                            }
                            from = 0;
                            if (!(fileSize >= MIN_SHARD_SIZE)) return [3 /*break*/, 2];
                            // =========== RS ============
                            console.log({ shardSize: shardSize, nShards: nShards, parityShards: parityShards, fileContentSize: fileContent.length });
                            console.log("Applying Reed Solomon. File size %s. Creating %s parities", fileContent.length, parityShards);
                            return [4 /*yield*/, rs_wrapper_1.encode(fileContent, shardSize, nShards, parityShards)];
                        case 1:
                            fileEncoded = _a.sent();
                            parities = fileEncoded.slice(nShards * shardSize);
                            // ===========================
                            console.log("Parities content size", parities.length);
                            // upload parities
                            for (i = 0; i < parityShards; i++, currentIndex++, from += shardSize) {
                                currentShard = Buffer.from(parities.slice(from, from + shardSize));
                                console.log("Uploading parity shard with size %s, index %s", currentShard.length, currentIndex);
                                uploadShardPromises.push(sendShard(currentShard, currentIndex, true));
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            console.log('File too small (%s), not creating parities', fileSize);
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 6, , 7]);
                            console.log('Waiting for upload to progress');
                            return [4 /*yield*/, Promise.all(uploadShardPromises)];
                        case 4:
                            uploadShardResponses = _a.sent();
                            console.log('Upload finished');
                            // TODO: Check message and way of handling
                            if (uploadShardResponses.length === 0) {
                                throw new Error('no upload requests has been made');
                            }
                            bucketEntry = {
                                frame: File.frameId,
                                filename: fileMeta.name,
                                index: File.index.toString('hex'),
                                hmac: {
                                    type: 'sha512',
                                    value: File.GenerateHmac(uploadShardResponses)
                                }
                            };
                            if (fileSize >= MIN_SHARD_SIZE) {
                                bucketEntry.erasure = { type: "reedsolomon" };
                            }
                            return [4 /*yield*/, File.SaveFileInNetwork(bucketEntry)];
                        case 5:
                            savingFileResponse = _a.sent();
                            // TODO: Change message and way of handling
                            if (!savingFileResponse) {
                                throw new Error('Can not save the file in network');
                            }
                            progress(100, totalBytes, totalBytes);
                            finish(null, savingFileResponse);
                            console.log('All shards uploaded, check it mf: %s', savingFileResponse.id);
                            return [2 /*return*/, resolve(null)];
                        case 6:
                            err_1 = _a.sent();
                            return [2 /*return*/, reject(err_1)];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
        });
    }).catch(function (err) {
        logger_1.logger.error("File upload went wrong due to " + err.message);
        finish(err, null);
    });
}
exports.Upload = Upload;
