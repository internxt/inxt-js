"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var download_1 = __importDefault(require("./lib/download"));
var fs_1 = __importDefault(require("fs"));
var stream_to_blob_1 = __importDefault(require("stream-to-blob"));
var Environment = /** @class */ (function () {
    function Environment(config) {
        this.config = config;
    }
    Environment.prototype.setEncryptionKey = function (newEncryptionKey) {
        this.config.encryptionKey = newEncryptionKey;
    };
    Environment.prototype.downloadFile = function (bucketId, fileId) {
        return download_1.default(this.config, bucketId, fileId).then(function (stream) {
            return stream_to_blob_1.default(stream, 'application/octet-stream');
        });
    };
    Environment.prototype.resolveFile = function (bucketId, fileId, filePath, options) {
        if (!options.overwritte && fs_1.default.existsSync(filePath)) {
            return options.finishedCallback(new Error('File already exists'));
        }
        var fileStream = fs_1.default.createWriteStream(filePath);
        download_1.default(this.config, bucketId, fileId).then(function (stream) {
            console.log('START DUMPING FILE');
            var dump = stream.pipe(fileStream);
            dump.on('error', function (err) {
                console.log('DUMP FILE error', err.message);
                options.finishedCallback(err);
            });
            dump.on('end', function (err) {
                console.log('DUMP FILE END');
                options.finishedCallback(err);
            });
        });
        return;
    };
    return Environment;
}());
exports.Environment = Environment;
