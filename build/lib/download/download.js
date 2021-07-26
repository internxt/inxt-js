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
exports.download = void 0;
var events_1 = require("../events");
var FileObject_1 = require("../../api/FileObject");
var constants_1 = require("../../api/constants");
function download(config, bucketId, fileId, options, debug, state) {
    return __awaiter(this, void 0, void 0, function () {
        var file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = new FileObject_1.FileObject(config, bucketId, fileId, debug);
                    handleStateChanges(file, state, options);
                    return [4 /*yield*/, file.getInfo()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file.getMirrors()];
                case 2:
                    _a.sent();
                    handleProgress(file, options);
                    return [2 /*return*/, file.download()];
            }
        });
    });
}
exports.download = download;
function handleProgress(fl, options) {
    var _a;
    var totalBytesDownloaded = 0;
    var totalBytesDecrypted = 0;
    var progress = 0;
    var totalBytes = fl.rawShards.length > 0 ?
        fl.rawShards.reduce(function (a, b) { return ({ size: a.size + b.size }); }, { size: 0 }).size :
        0;
    if (totalBytes === 0) {
        throw new Error('Total file size can not be 0');
    }
    function getDownloadProgress() {
        return (totalBytesDownloaded / totalBytes);
    }
    function getDecryptionProgress() {
        return (totalBytesDecrypted / totalBytes);
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
