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
var rs_wrapper_1 = require("rs-wrapper");
var FileObjectUpload_1 = require("../../api/FileObjectUpload");
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
    return __awaiter(this, void 0, void 0, function () {
        var File, Output, fileSize, fileContent;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.encryptionKey) {
                        throw new Error('Encryption key is null');
                    }
                    return [4 /*yield*/, new FileObjectUpload_1.FileObjectUpload(config, fileMeta, bucketId).init()];
                case 1:
                    File = _a.sent();
                    return [4 /*yield*/, File.StartUploadFile()];
                case 2:
                    Output = _a.sent();
                    fileSize = fileMeta.size;
                    fileContent = Buffer.alloc(0);
                    progress(0, 0, fileSize);
                    Output.on('data', function (shard) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            fileContent = Buffer.concat([fileContent, shard]);
                            return [2 /*return*/];
                        });
                    }); });
                    Output.on('error', function (err) { return finish(err, null); });
                    Output.on('end', function () { return __awaiter(_this, void 0, void 0, function () {
                        var shardSize, nShards, parityShards, rs, totalSize, action, shardUploadRequests, paritiesUploadRequests, parities, currentBytesUploaded_1, uploadResponses, savingFileResponse, err_1;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    shardSize = rs_wrapper_1.utils.determineShardSize(fileSize);
                                    nShards = Math.ceil(fileSize / shardSize);
                                    parityShards = rs_wrapper_1.utils.determineParityShards(nShards);
                                    rs = fileSize >= MIN_SHARD_SIZE;
                                    totalSize = rs ? fileSize + (parityShards * shardSize) : fileSize;
                                    action = {
                                        fileContent: fileContent, nShards: nShards, shardSize: shardSize,
                                        fileObject: File, firstIndex: 0, parity: false
                                    };
                                    console.log('Shards obtained %s, shardSize %s', nShards, shardSize);
                                    shardUploadRequests = uploadShards(action);
                                    paritiesUploadRequests = [];
                                    if (!rs) return [3 /*break*/, 2];
                                    console.log({ shardSize: shardSize, nShards: nShards, parityShards: parityShards, fileContentSize: fileContent.length });
                                    console.log("Applying Reed Solomon. File size %s. Creating %s parities", fileContent.length, parityShards);
                                    return [4 /*yield*/, getParities(fileContent, shardSize, nShards, parityShards)];
                                case 1:
                                    parities = _a.sent();
                                    console.log("Parities content size", parities.length);
                                    action.fileContent = Buffer.from(parities);
                                    action.firstIndex = shardUploadRequests.length;
                                    action.parity = true;
                                    action.nShards = parityShards;
                                    // upload parities
                                    paritiesUploadRequests = uploadShards(action);
                                    return [3 /*break*/, 3];
                                case 2:
                                    console.log('File too small (%s), not creating parities', fileSize);
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 6, , 7]);
                                    console.log('Waiting for upload to progress');
                                    currentBytesUploaded_1 = 0;
                                    return [4 /*yield*/, Promise.all(shardUploadRequests.concat(paritiesUploadRequests).map(function (request) { return __awaiter(_this, void 0, void 0, function () {
                                            var shardMeta;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, request];
                                                    case 1:
                                                        shardMeta = _a.sent();
                                                        currentBytesUploaded_1 = updateProgress(totalSize, currentBytesUploaded_1, shardMeta.size, progress);
                                                        return [2 /*return*/, shardMeta];
                                                }
                                            });
                                        }); }))];
                                case 4:
                                    uploadResponses = _a.sent();
                                    console.log('Upload finished');
                                    // TODO: Check message and way of handling
                                    if (uploadResponses.length === 0) {
                                        throw new Error('no upload requests has been made');
                                    }
                                    return [4 /*yield*/, createBucketEntry(File, fileMeta, uploadResponses, rs)];
                                case 5:
                                    savingFileResponse = _a.sent();
                                    // TODO: Change message and way of handling
                                    if (!savingFileResponse) {
                                        throw new Error('Can not save the file in network');
                                    }
                                    progress(100, fileSize, fileSize);
                                    finish(null, savingFileResponse);
                                    console.log('All shards uploaded, check it mf: %s', savingFileResponse.id);
                                    return [3 /*break*/, 7];
                                case 6:
                                    err_1 = _a.sent();
                                    finish(err_1, null);
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
}
exports.Upload = Upload;
function createBucketEntry(fileObject, fileMeta, shardMetas, rs) {
    var bucketEntry = {
        frame: fileObject.frameId,
        filename: fileMeta.name,
        index: fileObject.index.toString('hex'),
        hmac: {
            type: 'sha512',
            value: fileObject.GenerateHmac(shardMetas)
        }
    };
    if (rs) {
        bucketEntry.erasure = { type: "reedsolomon" };
    }
    return fileObject.SaveFileInNetwork(bucketEntry);
}
function getParities(file, shardSize, totalShards, parityShards) {
    return __awaiter(this, void 0, void 0, function () {
        var fileEncoded;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, rs_wrapper_1.encode(file, shardSize, totalShards, parityShards)];
                case 1:
                    fileEncoded = _a.sent();
                    return [2 /*return*/, fileEncoded.slice(totalShards * shardSize)];
            }
        });
    });
}
function updateProgress(totalBytes, currentBytesUploaded, newBytesUploaded, progress) {
    var newCurrentBytes = currentBytesUploaded + newBytesUploaded;
    var progressCounter = Math.ceil((newCurrentBytes / totalBytes) * 100);
    progress(progressCounter, newCurrentBytes, totalBytes);
    return newCurrentBytes;
}
function uploadShards(action) {
    var from = 0;
    var currentShard = null;
    var shardUploadRequests = [];
    for (var i = action.firstIndex; i < (action.firstIndex + action.nShards); i++) {
        currentShard = action.fileContent.slice(from, from + action.shardSize);
        console.log('Uploading shard index %s size %s parity %s', i, currentShard.length, action.parity);
        shardUploadRequests.push(uploadShard(action.fileObject, currentShard, i, action.parity));
        from += action.shardSize;
    }
    return shardUploadRequests;
}
function uploadShard(fileObject, shard, index, isParity) {
    return fileObject.UploadShard(shard, shard.length, fileObject.frameId, index, 3, isParity);
}
