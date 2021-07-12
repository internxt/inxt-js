"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadOptionsAdapter = exports.DownloadOptionsAdapter = void 0;
var logger_1 = require("../../lib/utils/logger");
var constants_1 = require("../constants");
/**
 * Adapts Desktop download options to std file download options
 * @param options Desktop download file options
 * @returns adapted options to std file download options
 */
exports.DownloadOptionsAdapter = function (options) {
    var downloadFinishedCallback = function (err, fileStream) {
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
        options.finishedCallback(err, fileStream);
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
