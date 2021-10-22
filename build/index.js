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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var blob_to_stream_1 = __importDefault(require("blob-to-stream"));
var stream_1 = require("stream");
var fs_1 = require("fs");
var path_1 = require("path");
var upload_1 = require("./lib/upload");
var download_1 = require("./lib/download");
var crypto_1 = require("./lib/crypto");
var constants_1 = require("./api/constants");
var ActionState_1 = require("./api/ActionState");
var logger_1 = require("./lib/utils/logger");
var fileinfo_1 = require("./api/fileinfo");
var api_1 = require("./services/api");
var EmptyStrategy_1 = require("./lib/upload/EmptyStrategy");
var hasher_1 = require("./lib/hasher");
var utils = {
    generateFileKey: crypto_1.GenerateFileKey,
    Hasher: hasher_1.HashStream
};
var Environment = /** @class */ (function () {
    function Environment(config) {
        var _this = this;
        this.upload = function (bucketId, opts, strategyObj) {
            var uploadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Upload);
            if (!_this.config.encryptionKey) {
                opts.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);
                return uploadState;
            }
            if (!bucketId) {
                opts.finishedCallback(Error('Bucket id was not provided'), null);
                return uploadState;
            }
            crypto_1.EncryptFilename(_this.config.encryptionKey, bucketId, opts.filename).then(function (encryptedFilename) {
                logger_1.logger.debug('Filename %s encrypted is %s', opts.filename, encryptedFilename);
                var fileMeta = { content: stream_1.Readable.from(''), size: 0, name: encryptedFilename };
                logger_1.logger.debug('Using %s strategy', strategyObj.label);
                var strategy = new EmptyStrategy_1.EmptyStrategy();
                if (strategyObj.label === 'OneStreamOnly') {
                    strategy = new upload_1.OneStreamStrategy(strategyObj.params);
                }
                if (strategy instanceof EmptyStrategy_1.EmptyStrategy) {
                    return opts.finishedCallback(new Error('Unknown upload strategy'), null);
                }
                return upload_1.uploadV2(_this.config, fileMeta, bucketId, opts, logger_1.logger, uploadState, strategy);
            }).catch(function (err) {
                if (err && err.message && err.message.includes('Upload aborted')) {
                    return opts.finishedCallback(new Error('Process killed by user'), null);
                }
                opts.finishedCallback(err, null);
            });
            return uploadState;
        };
        this.download = function (bucketId, fileId, opts, strategyObj) {
            var downloadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Download);
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
            if (opts.debug) {
                _this.logger = logger_1.Logger.getDebugger(_this.config.logLevel || 1, opts.debug);
            }
            var strategy = new download_1.OneStreamStrategy(_this.config, _this.logger);
            download_1.download(_this.config, bucketId, fileId, opts, _this.logger, downloadState, strategy).then(function (res) {
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
    /**
     * Uploads a file from a web browser
     * @param bucketId Bucket id where file is going to be stored
     * @param params Upload file params
     */
    Environment.prototype.uploadFile = function (bucketId, params) {
        var uploadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.Upload);
        var filename = params.filename, size = params.fileSize, fileContent = params.fileContent;
        if (!filename) {
            params.finishedCallback(Error('Filename was not provided'), null);
            return uploadState;
        }
        if (fileContent.size === 0) {
            params.finishedCallback(Error('Can not upload a file with size 0'), null);
            return uploadState;
        }
        var file = { content: blob_to_stream_1.default(fileContent), plainName: filename, size: size };
        return this.uploadStream(bucketId, file, params, uploadState);
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
    Environment.prototype.downloadCancel = function (state) {
        state.stop();
    };
    Environment.prototype.uploadCancel = function (state) {
        state.stop();
    };
    /**
     * Uploads a file from a stream
     * @param bucketId Bucket id where file is going to be stored
     * @param params Store file params
     */
    Environment.prototype.uploadStream = function (bucketId, file, params, givenUploadState) {
        var _this = this;
        var uploadState = givenUploadState !== null && givenUploadState !== void 0 ? givenUploadState : new ActionState_1.ActionState(ActionState_1.ActionTypes.Upload);
        if (!this.config.encryptionKey) {
            params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);
            return uploadState;
        }
        if (!bucketId) {
            params.finishedCallback(Error('Bucket id was not provided'), null);
            return uploadState;
        }
        crypto_1.EncryptFilename(this.config.encryptionKey, bucketId, file.plainName)
            .then(function (encryptedName) {
            logger_1.logger.debug('Filename %s encrypted is %s', file.plainName, encryptedName);
            var content = file.content, size = file.size;
            var fileMeta = { content: content, size: size, name: encryptedName };
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
    Environment.prototype.renameFile = function (bucketId, fileId, newPlainName) {
        return __awaiter(this, void 0, void 0, function () {
            var mnemonic;
            var _this = this;
            return __generator(this, function (_a) {
                mnemonic = this.config.encryptionKey;
                if (!mnemonic) {
                    throw new Error(constants_1.ENCRYPTION_KEY_NOT_PROVIDED);
                }
                return [2 /*return*/, crypto_1.EncryptFilename(mnemonic, bucketId, newPlainName).then(function (newEncryptedName) {
                        return new api_1.Bridge(_this.config).renameFile(bucketId, fileId, newEncryptedName).start();
                    }).then(function () { })];
            });
        });
    };
    /**
     * Cancels a file upload
     * @param {ActionState} state Upload state
     */
    Environment.prototype.storeFileCancel = function (state) {
        state.stop();
    };
    Environment.utils = utils;
    return Environment;
}());
exports.Environment = Environment;
