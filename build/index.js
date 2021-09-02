"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var blob_to_stream_1 = __importDefault(require("blob-to-stream"));
var fs_1 = require("fs");
var upload_1 = require("./lib/upload");
var download_1 = require("./lib/download");
var crypto_1 = require("./lib/crypto");
var constants_1 = require("./api/constants");
var ActionState_1 = require("./api/ActionState");
var Web_1 = require("./api/adapters/Web");
var logger_1 = require("./lib/utils/logger");
var path_1 = require("path");
var stream_to_blob_1 = __importDefault(require("stream-to-blob"));
var fileinfo_1 = require("./api/fileinfo");
var api_1 = require("./services/api");
var utils = {
    generateFileKey: crypto_1.GenerateFileKey
};
var Environment = /** @class */ (function () {
    function Environment(config) {
        this.config = config;
        this.logger = logger_1.Logger.getInstance(1);
    }
    /**
     * Gets general API info
     * @param cb Callback that will receive api's info
     */
    Environment.prototype.getInfo = function (cb) {
        /* TODO */
        cb(null, 'Not implemented yet');
    };
    /**
     * Gets file info
     * @param bucketId Bucket id where file is stored
     * @param fileId
     * @returns file info
     */
    Environment.prototype.getFileInfo = function (bucketId, fileId) {
        return fileinfo_1.GetFileInfo(this.config, bucketId, fileId);
    };
    /**
     * Gets list of available buckets
     * @param cb Callback that will receive the list of buckets
     */
    Environment.prototype.getBuckets = function (cb) {
        /* TODO */
        cb(Error('Not implemented yet'), null);
    };
    /**
     * Gets a bucket id by name
     * @param bucketName Name of the bucket to be retrieved
     * @param cb Callback that will receive the bucket id
     */
    Environment.prototype.getBucketId = function (bucketName, cb) {
        /* TODO */
        cb(Error('Not implemented yet'), null);
    };
    /**
     * Creates a bucket
     * @param bucketName Name of the new bucket
     * @param cb Callback that will receive the response after creation
     */
    Environment.prototype.createBucket = function (bucketName, cb) {
        /* TODO */
        cb(Error('Not implemented yet'), null);
    };
    /**
     * Creates file token
     * @param bucketId Bucket id where file is stored
     * @param fileId File id
     * @param operation
     * @param cb
     */
    Environment.prototype.createFileToken = function (bucketId, fileId, operation) {
        return new api_1.Bridge(this.config).createFileToken(bucketId, fileId, operation).start()
            .then(function (res) {
            return res.token;
        });
    };
    /**
     * Deletes a bucket
     * @param bucketId Id whose bucket is going to be deleted
     * @param cb Callback that will receive the response after deletion
     */
    Environment.prototype.deleteBucket = function (bucketId, cb) {
        /* TODO */
        cb(Error('Not implemented yet'), null);
    };
    /**
     * Deletes a file from a bucket
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be deleted
     * @param cb Callback that receives the response after deletion
     */
    Environment.prototype.deleteFile = function (bucketId, fileId, cb) {
        /* TODO */
        cb(Error('Not implemented yet'), null);
    };
    /**
     * Lists files in a bucket
     * @param bucketId Bucket id whose files are going to be listed
     * @param cb Callback that receives the files list
     */
    Environment.prototype.listFiles = function (bucketId, cb) {
        /* TODO */
        cb(Error('Not implemented yet'), null);
    };
    Environment.prototype.setEncryptionKey = function (newEncryptionKey) {
        this.config.encryptionKey = newEncryptionKey;
    };
    Environment.prototype.downloadFile = function (bucketId, fileId, options) {
        var downloadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Download);
        if (!options.fileEncryptionKey && !this.config.encryptionKey) {
            options.finishedCallback(Error(constants_1.ENCRYPTION_KEY_NOT_PROVIDED), null);
            return downloadState;
        }
        if (!bucketId) {
            options.finishedCallback(Error(constants_1.BUCKET_ID_NOT_PROVIDED), null);
            return downloadState;
        }
        download_1.download(this.config, bucketId, fileId, Web_1.adapt(options), this.logger, downloadState)
            .then(function (downloadStream) {
            return stream_to_blob_1.default(downloadStream, 'application/octet-stream');
        }).then(function (blob) {
            options.finishedCallback(null, blob);
        }).catch(function (err) {
            options.finishedCallback(err, null);
        });
        return downloadState;
    };
    /**
     * Uploads a file from a web browser
     * @param bucketId Bucket id where file is going to be stored
     * @param params Upload file params
     */
    Environment.prototype.uploadFile = function (bucketId, params) {
        var _this = this;
        var uploadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Upload);
        if (!this.config.encryptionKey) {
            params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);
            return uploadState;
        }
        if (!bucketId) {
            params.finishedCallback(Error('Bucket id was not provided'), null);
            return uploadState;
        }
        if (!params.filename) {
            params.finishedCallback(Error('Filename was not provided'), null);
            return uploadState;
        }
        if (params.fileContent.size === 0) {
            params.finishedCallback(Error('Can not upload a file with size 0'), null);
            return uploadState;
        }
        var filename = params.filename, size = params.fileSize, fileContent = params.fileContent;
        crypto_1.EncryptFilename(this.config.encryptionKey, bucketId, filename)
            .then(function (name) {
            _this.logger.debug('Filename %s encrypted is %s', filename, name);
            var content = blob_to_stream_1.default(fileContent);
            var fileToUpload = { content: content, name: name, size: size };
            return upload_1.upload(_this.config, bucketId, fileToUpload, params, _this.logger, uploadState);
        })
            .catch(function (err) {
            _this.logger.error("Error encrypting filename due to " + err.message);
            _this.logger.error(err);
            params.finishedCallback(err, null);
        });
        return uploadState;
    };
    /**
     * Uploads a file from file system
     * @param bucketId Bucket id where file is going to be stored
     * @param params Store file params
     */
    Environment.prototype.storeFile = function (bucketId, filepath, params) {
        var _this = this;
        var uploadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Upload);
        if (!this.config.encryptionKey) {
            params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);
            return uploadState;
        }
        if (!bucketId) {
            params.finishedCallback(Error('Bucket id was not provided'), null);
            return uploadState;
        }
        var fileStat = fs_1.statSync(filepath);
        if (fileStat.size === 0) {
            params.finishedCallback(Error('Can not upload a file with size 0'), null);
            return uploadState;
        }
        if (params.debug) {
            this.logger = logger_1.Logger.getDebugger(this.config.logLevel || 1, params.debug);
        }
        var filename = params.filename || path_1.basename(filepath);
        crypto_1.EncryptFilename(this.config.encryptionKey, bucketId, filename)
            .then(function (name) {
            logger_1.logger.debug('Filename %s encrypted is %s', filename, name);
            var fileMeta = { content: fs_1.createReadStream(filepath), name: name, size: fileStat.size };
            return upload_1.upload(_this.config, bucketId, fileMeta, params, _this.logger, uploadState);
        }).then(function () {
            _this.logger.info('Upload Success!');
        }).catch(function (err) {
            if (err && err.message && err.message.includes('Upload aborted')) {
                return params.finishedCallback(new Error('Process killed by user'), null);
            }
            params.finishedCallback(err, null);
        });
        return uploadState;
    };
    /**
     * Cancels a file upload
     * @param {ActionState} state Upload state
     */
    Environment.prototype.storeFileCancel = function (state) {
        state.stop();
    };
    /**
     * Downloads a file, returns state object
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be downloaded
     * @param filePath File path where the file maybe already is
     * @param options Options for resolve file case
     */
    Environment.prototype.resolveFile = function (bucketId, fileId, filepath, params) {
        var downloadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Download);
        if (!this.config.encryptionKey) {
            params.finishedCallback(Error(constants_1.ENCRYPTION_KEY_NOT_PROVIDED), null);
            return downloadState;
        }
        if (!bucketId) {
            params.finishedCallback(Error(constants_1.BUCKET_ID_NOT_PROVIDED), null);
            return downloadState;
        }
        if (!fileId) {
            params.finishedCallback(Error('File id not provided'), null);
            return downloadState;
        }
        if (params.debug) {
            this.logger = logger_1.Logger.getDebugger(this.config.logLevel || 1, params.debug);
        }
        var destination = fs_1.createWriteStream(filepath);
        downloadState.once(constants_1.DOWNLOAD_CANCELLED, function () {
            destination.emit('error', new Error('Process killed by user'));
        });
        destination.once('error', function (err) {
            destination.destroy();
            params.finishedCallback(err, null);
        });
        destination.once('finish', function () {
            destination.destroy();
            params.finishedCallback(null, null);
        });
        download_1.download(this.config, bucketId, fileId, params, this.logger, downloadState)
            .then(function (fileStream) {
            fileStream.on('error', function (err) { return destination.emit('error', err); });
            fileStream.pipe(destination);
        }).catch(function (err) {
            destination.destroy();
            params.finishedCallback(err, null);
        });
        return downloadState;
    };
    /**
     * Cancels the download
     * @param state Download file state at the moment
     */
    Environment.prototype.resolveFileCancel = function (state) {
        state.stop();
    };
    Environment.utils = utils;
    return Environment;
}());
exports.Environment = Environment;
