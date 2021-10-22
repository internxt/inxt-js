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
exports.uploadV2 = exports.upload = void 0;
var constants_1 = require("../../api/constants");
var FileObjectUpload_1 = require("../../api/FileObjectUpload");
var FileObjectUploadV2_1 = require("../../api/FileObjectUploadV2");
var logger_1 = require("../utils/logger");
var UploadStrategy_1 = require("./UploadStrategy");
var events_1 = require("../../api/events");
/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
function upload(config, bucketId, fileMeta, params, debug, actionState) {
    return __awaiter(this, void 0, void 0, function () {
        var file, uploadResponses;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = new FileObjectUpload_1.FileObjectUpload(config, fileMeta, bucketId, debug);
                    actionState.on(constants_1.UPLOAD_CANCELLED, function () {
                        file.emit(constants_1.UPLOAD_CANCELLED);
                    });
                    return [4 /*yield*/, file.init()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file.checkBucketExistence()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, file.stage()];
                case 3:
                    _a.sent();
                    file.encrypt();
                    return [4 /*yield*/, file.upload(params.progressCallback)];
                case 4:
                    uploadResponses = _a.sent();
                    logger_1.logger.debug('Upload finished. Creating bucket entry...');
                    return [4 /*yield*/, file.createBucketEntry(uploadResponses)];
                case 5:
                    _a.sent();
                    logger_1.logger.info('Uploaded file with id %s', file.getId());
                    params.progressCallback(1, file.getSize(), file.getSize());
                    params.finishedCallback(null, file.getId());
                    return [2 /*return*/];
            }
        });
    });
}
exports.upload = upload;
function uploadV2(config, fileMeta, bucketId, params, debug, actionState, uploader) {
    return __awaiter(this, void 0, void 0, function () {
        var file, shardMetas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = new FileObjectUploadV2_1.FileObjectUploadV2(config, fileMeta, bucketId, debug, uploader);
                    actionState.once(events_1.Events.Upload.Abort, function () {
                        file.emit(events_1.Events.Upload.Abort);
                        actionState.removeAllListeners();
                    });
                    file.on(UploadStrategy_1.UploadEvents.Progress, function (progress) {
                        params.progressCallback(progress, 0, 0);
                    });
                    return [4 /*yield*/, file.init()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file.checkBucketExistence()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, file.stage()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, file.upload()];
                case 4:
                    shardMetas = _a.sent();
                    logger_1.logger.debug('Upload finished. Creating bucket entry...');
                    return [4 /*yield*/, file.createBucketEntry(shardMetas)];
                case 5:
                    _a.sent();
                    logger_1.logger.info('Uploaded file with id %s', file.getId());
                    params.progressCallback(1, file.getSize(), file.getSize());
                    params.finishedCallback(null, file.getId());
                    return [2 /*return*/];
            }
        });
    });
}
exports.uploadV2 = uploadV2;
