"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadOptionsAdapter = exports.DownloadOptionsAdapter = void 0;
var stream_to_blob_1 = __importDefault(require("stream-to-blob"));
var logger_1 = require("../../lib/utils/logger");
var constants_1 = require("../constants");
/**
 * Adapts web download options to std file download options
 * @param options web download file options
 * @returns adapted options to std file download options
 */
exports.DownloadOptionsAdapter = function (options) {
    var downloadFinishedCallback = function (err, fileStream) {
        console.log('download finished callback');
        if (err) {
            if (err.message === constants_1.DOWNLOAD_CANCELLED) {
                logger_1.logger.info('Download cancelled');
                return options.finishedCallback(null, null);
            }
            logger_1.logger.error('Error downloading file due to %s', err.message);
            logger_1.logger.error(err);
            return options.finishedCallback(err, null);
        }
        if (!fileStream) {
            return options.finishedCallback(Error('File stream is null'), null);
        }
        console.log('still here');
        stream_to_blob_1.default(fileStream, 'application/octet-stream').then(function (blob) {
            console.log('BLOB', blob);
            options.finishedCallback(null, blob);
        }).catch(function (blobParsingErr) {
            options.finishedCallback(blobParsingErr, null);
        });
    };
    return {
        progressCallback: options.progressCallback,
        decryptionProgressCallback: options.decryptionProgressCallback,
        finishedCallback: downloadFinishedCallback
    };
};
exports.UploadOptionsAdapter = function (options) {
    // TODO
};
