"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var download_1 = __importDefault(require("./lib/download"));
var fs_1 = __importDefault(require("fs"));
var Environment = /** @class */ (function () {
    function Environment(config) {
        this.config = config;
    }
    Environment.prototype.setEncryptionKey = function (newEncryptionKey) {
        this.config.encryptionKey = newEncryptionKey;
    };
    Environment.prototype.resolveFile = function (bucketId, fileId, filePath, options) {
        if (!options.overwritte && fs_1.default.existsSync(filePath)) {
            return options.finishedCallback(new Error('File already exists'));
        }
        var fileStream = fs_1.default.createWriteStream(filePath);
        download_1.default(this.config, bucketId, fileId).then(function (stream) {
            var dump = stream.pipe(fileStream);
            dump.on('error', function (err) {
                options.finishedCallback(err);
            });
            dump.on('end', function (err) {
                options.finishedCallback(err);
            });
        });
        return;
    };
    return Environment;
}());
exports.Environment = Environment;
