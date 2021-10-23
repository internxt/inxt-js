"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var core_1 = require("./lib/core");
var crypto_1 = require("./lib/utils/crypto");
// TODO: Remove this
var constants_1 = require("./api/constants");
var api_1 = require("./api");
var logger_1 = require("./lib/utils/logger");
var fileinfo_1 = require("./api/fileinfo");
var api_2 = require("./services/api");
var streams_1 = require("./lib/utils/streams");
var utils = {
    generateFileKey: crypto_1.GenerateFileKey,
    Hasher: streams_1.HashStream
};
var Environment = /** @class */ (function () {
    function Environment(config) {
        var _this = this;
        this.upload = function (bucketId, opts, strategyObj) {
            var uploadState = new api_1.ActionState(api_1.ActionTypes.Upload);
            if (!_this.config.encryptionKey) {
                opts.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);
                return uploadState;
            }
            if (!bucketId) {
                opts.finishedCallback(Error('Bucket id was not provided'), null);
                return uploadState;
            }
            crypto_1.EncryptFilename(_this.config.encryptionKey, bucketId, opts.name).then(function (encryptedFilename) {
                logger_1.logger.debug('Filename %s encrypted is %s', opts.name, encryptedFilename);
                logger_1.logger.debug('Using %s strategy', strategyObj.label);
                var strategy = null;
                if (strategyObj.label === 'OneStreamOnly') {
                    strategy = new core_1.UploadOneStreamStrategy(strategyObj.params);
                }
                if (!strategy) {
                    return opts.finishedCallback(Error('Unknown strategy'), null);
                }
                return core_1.upload(_this.config, encryptedFilename, bucketId, opts, uploadState, strategy).then(function (fileId) {
                    opts.finishedCallback(null, fileId);
                });
            }).catch(function (err) {
                if (err && err.message && err.message.includes('Upload aborted')) {
                    return opts.finishedCallback(new Error('Process killed by user'), null);
                }
                opts.finishedCallback(err, null);
            });
            return uploadState;
        };
        this.download = function (bucketId, fileId, opts, strategyObj) {
            var downloadState = new api_1.ActionState(api_1.ActionTypes.Download);
            if (!_this.config.encryptionKey) {
                opts.finishedCallback(Error(constants_1.ENCRYPTION_KEY_NOT_PROVIDED), null);
                return downloadState;
            }
            if (!bucketId) {
                opts.finishedCallback(Error(constants_1.BUCKET_ID_NOT_PROVIDED), null);
                return downloadState;
            }
            if (!fileId) {
                opts.finishedCallback(Error('File id not provided'), null);
                return downloadState;
            }
            var strategy = new core_1.OneStreamStrategy(_this.config);
            core_1.download(_this.config, bucketId, fileId, opts, downloadState, strategy).then(function (res) {
                opts.finishedCallback(null, res);
            }).catch(function (err) {
                opts.finishedCallback(err, null);
            });
            return downloadState;
        };
        this.config = config;
        this.logger = logger_1.Logger.getInstance(1);
    }
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
        return new api_2.Bridge(this.config).createFileToken(bucketId, fileId, operation).start()
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
    Environment.prototype.downloadCancel = function (state) {
        state.stop();
    };
    Environment.prototype.uploadCancel = function (state) {
        state.stop();
    };
    Environment.prototype.renameFile = function (bucketId, fileId, newPlainName) {
        var _this = this;
        var mnemonic = this.config.encryptionKey;
        if (!mnemonic) {
            throw new Error(constants_1.ENCRYPTION_KEY_NOT_PROVIDED);
        }
        return crypto_1.EncryptFilename(mnemonic, bucketId, newPlainName).then(function (newEncryptedName) {
            return new api_2.Bridge(_this.config).renameFile(bucketId, fileId, newEncryptedName).start();
        }).then(function () { });
    };
    Environment.utils = utils;
    return Environment;
}());
exports.Environment = Environment;
