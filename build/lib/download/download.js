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
exports.Download = void 0;
var rs_wrapper_1 = require("rs-wrapper");
var FileObject_1 = require("../../api/FileObject");
var events_1 = require("../events");
var logger_1 = require("../utils/logger");
var buffer_1 = require("../utils/buffer");
var promisify_1 = require("../utils/promisify");
var constants_1 = require("../../api/constants");
function Download(config, bucketId, fileId, options, state) {
    return __awaiter(this, void 0, void 0, function () {
        var File_1, fileStream, fileChunks_1, shards, parities, fileContent, rs, shardsStatus, corruptShards, fileSize, _a, _b, err_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // if (!config.encryptionKey) { throw Error('Encryption key required'); }
                    if (!bucketId) {
                        throw Error('Bucket id required');
                    }
                    if (!fileId) {
                        throw Error('File id required');
                    }
                    console.log('fileId', fileId);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, , 11]);
                    File_1 = new FileObject_1.FileObject(config, bucketId, fileId);
                    handleStateChanges(File_1, state, options);
                    return [4 /*yield*/, File_1.GetFileInfo()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, File_1.GetFileMirrors()];
                case 3:
                    _c.sent();
                    handleProgress(File_1, options);
                    return [4 /*yield*/, File_1.download()];
                case 4:
                    fileStream = _c.sent();
                    fileChunks_1 = [];
                    shards = File_1.rawShards.filter(function (shard) { return !shard.parity; }).length;
                    parities = File_1.rawShards.length - shards;
                    fileStream.on('data', function (chunk) { fileChunks_1.push(chunk); });
                    return [4 /*yield*/, promisify_1.promisifyStream(fileStream)];
                case 5:
                    _c.sent();
                    console.log('HE PODIDO DESCARGARLO');
                    fileContent = Buffer.concat(fileChunks_1);
                    rs = File_1.fileInfo && File_1.fileInfo.erasure && File_1.fileInfo.erasure.type === 'reedsolomon';
                    shardsStatus = File_1.rawShards.map(function (shard) { return shard.healthy; });
                    corruptShards = shardsStatus.filter(function (status) { return !status; }).length;
                    fileSize = File_1.final_length;
                    if (!(corruptShards > 0)) return [3 /*break*/, 8];
                    if (!rs) return [3 /*break*/, 7];
                    logger_1.logger.info('Some shard(s) is/are corrupt and rs is available. Recovering');
                    _b = (_a = Buffer).from;
                    return [4 /*yield*/, rs_wrapper_1.reconstruct(fileContent, shards, parities, shardsStatus)];
                case 6:
                    fileContent = _b.apply(_a, [_c.sent()]).slice(0, fileSize);
                    return [2 /*return*/, options.finishedCallback(null, buffer_1.bufferToStream(fileContent).pipe(File_1.decipher))];
                case 7: return [2 /*return*/, options.finishedCallback(Error(corruptShards + ' file shard(s) is/are corrupt'), null)];
                case 8: return [2 /*return*/, options.finishedCallback(null, buffer_1.bufferToStream(fileContent.slice(0, fileSize)).pipe(File_1.decipher))];
                case 9: return [3 /*break*/, 11];
                case 10:
                    err_1 = _c.sent();
                    console.error(err_1);
                    options.finishedCallback(err_1, null);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.Download = Download;
// TODO: use propagate lib
function attachFileObjectListeners(f, notified) {
    // propagate events to notified
    f.on(events_1.FILEMUXER.PROGRESS, function (msg) { return notified.emit(events_1.FILEMUXER.PROGRESS, msg); });
    // TODO: Handle filemuxer errors
    f.on(events_1.FILEMUXER.ERROR, function (err) { return notified.emit(events_1.FILEMUXER.ERROR, err); });
    // TODO: Handle fileObject errors
    f.on('error', function (err) { return notified.emit(events_1.FILEOBJECT.ERROR, err); });
    // f.on('end', () => notified.emit(FILEOBJECT.END))
    // f.decipher.on('end', () => notified.emit(DECRYPT.END))
    f.decipher.once('error', function (err) { return notified.emit(events_1.DECRYPT.ERROR, err); });
}
function handleProgress(fl, options) {
    var _a;
    var totalBytesDownloaded = 0, totalBytesDecrypted = 0;
    var progress = 0;
    var totalBytes = fl.rawShards.length > 0 ?
        fl.rawShards.reduce(function (a, b) { return ({ size: a.size + b.size }); }, { size: 0 }).size :
        0;
    if (totalBytes === 0) {
        throw new Error('Total file size can not be 0');
    }
    function getDownloadProgress() {
        return (totalBytesDownloaded / totalBytes) * 100;
    }
    function getDecryptionProgress() {
        return (totalBytesDecrypted / totalBytes) * 100;
    }
    fl.on(events_1.DOWNLOAD.PROGRESS, function (addedBytes) {
        totalBytesDownloaded += addedBytes;
        progress = getDownloadProgress();
        options.progressCallback(progress, totalBytesDownloaded, totalBytes);
    });
    var decryptionProgress = (_a = options.decryptionProgressCallback) !== null && _a !== void 0 ? _a : (function () { return null; });
    fl.on(events_1.DECRYPT.PROGRESS, function (addedBytes) {
        totalBytesDecrypted += addedBytes;
        progress = getDecryptionProgress();
        decryptionProgress(progress, totalBytesDecrypted, totalBytes);
    });
}
function handleStateChanges(file, state, options) {
    state.on(constants_1.DOWNLOAD_CANCELLED, function () {
        file.emit(constants_1.DOWNLOAD_CANCELLED);
        options.finishedCallback(Error(constants_1.DOWNLOAD_CANCELLED_ERROR), null);
        // prevent more calls to any callback
        options.progressCallback = function () { };
        options.finishedCallback = function () { };
    });
}
