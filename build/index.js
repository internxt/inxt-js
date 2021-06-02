"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rsTest = exports.Environment = void 0;
var blob_to_stream_1 = __importDefault(require("blob-to-stream"));
var rs_wrapper_1 = require("rs-wrapper");
var crypto_1 = require("crypto");
var upload_1 = require("./lib/upload");
var download_1 = require("./lib/download");
var crypto_2 = require("./lib/crypto");
var logger_1 = require("./lib/utils/logger");
var constants_1 = require("./api/constants");
var ActionState_1 = require("./api/ActionState");
var Web_1 = require("./api/adapters/Web");
var Environment = /** @class */ (function () {
    function Environment(config) {
        this.config = config;
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
        var downloadState = new ActionState_1.ActionState(ActionState_1.ActionTypes.DOWNLOAD);
        if (!this.config.encryptionKey) {
            options.finishedCallback(Error(constants_1.ENCRYPTION_KEY_NOT_PROVIDED), null);
            return downloadState;
        }
        if (!bucketId) {
            options.finishedCallback(Error(constants_1.BUCKET_ID_NOT_PROVIDED), null);
            return downloadState;
        }
        download_1.Download(this.config, bucketId, fileId, Web_1.DownloadOptionsAdapter(options), downloadState);
        return downloadState;
    };
    /**
     * Uploads a file from a web browser
     * @param bucketId Bucket id where file is going to be stored
     * @param params Upload file params
     */
    Environment.prototype.uploadFile = function (bucketId, params) {
        var _this = this;
        if (!this.config.encryptionKey) {
            params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);
            return;
        }
        if (!bucketId) {
            params.finishedCallback(Error('Bucket id was not provided'), null);
            return;
        }
        if (!params.filename) {
            params.finishedCallback(Error('Filename was not provided'), null);
            return;
        }
        if (params.fileContent.size === 0) {
            params.finishedCallback(Error('Can not upload a file with size 0'), null);
            return;
        }
        var filename = params.filename, size = params.fileSize, fileContent = params.fileContent, progress = params.progressCallback, finished = params.finishedCallback;
        crypto_2.EncryptFilename(this.config.encryptionKey, bucketId, filename)
            .then(function (name) {
            logger_1.logger.debug("Filename " + filename + " encrypted is " + name);
            var content = blob_to_stream_1.default(fileContent);
            var fileToUpload = { content: content, name: name, size: size };
            upload_1.Upload(_this.config, bucketId, fileToUpload, progress, finished);
        })
            .catch(function (err) {
            logger_1.logger.error("Error encrypting filename due to " + err.message);
            logger_1.logger.error(err);
            finished(err, null);
        });
    };
    /**
     * Downloads a file, returns state object
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be downloaded
     * @param filePath File path where the file maybe already is
     * @param options Options for resolve file case
     */
    // resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): void {
    //   if (!options.overwritte && fs.existsSync(filePath)) {
    //     return options.finishedCallback(new Error('File already exists'))
    //   }
    //   const fileStream = fs.createWriteStream(filePath)
    //   Download(this.config, bucketId, fileId, options).then(stream => {
    //     console.log('START DUMPING FILE')
    //     const dump = stream.pipe(fileStream)
    //     dump.on('error', (err) => {
    //       console.log('DUMP FILE error', err.message)
    //       options.finishedCallback(err)
    //     })
    //     dump.on('end', (err) => {
    //       console.log('DUMP FILE END')
    //       options.finishedCallback(err)
    //     })
    //   })
    //   /* TODO: Returns state object */
    //   return
    // }
    /**
     * Cancels the download
     * @param state Download file state at the moment
     */
    Environment.prototype.resolveFileCancel = function (state) {
        state.stop();
    };
    return Environment;
}());
exports.Environment = Environment;
function rsTest(size) {
    var buffer = crypto_1.randomBytes(size);
    console.log(buffer.length);
    var shardSize = rs_wrapper_1.utils.determineShardSize(size);
    var nShards = Math.ceil(size / shardSize);
    var parityShards = rs_wrapper_1.utils.determineParityShards(nShards);
    return rs_wrapper_1.encode(buffer, shardSize, nShards, parityShards).then(function (file) {
        file[1] = 'g'.charCodeAt(0);
        var totalShards = nShards + parityShards;
        var arr = new Array(totalShards).fill(true);
        arr[0] = false;
        return rs_wrapper_1.reconstruct(file, nShards, parityShards, arr);
    });
}
exports.rsTest = rsTest;
