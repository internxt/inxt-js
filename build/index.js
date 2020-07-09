"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var download_1 = __importDefault(require("./lib/download"));
var Environment = /** @class */ (function () {
    function Environment(config) {
        this.config = config;
    }
    Environment.prototype.setEncryptionKey = function (newEncryptionKey) {
        this.config.encryptionKey = newEncryptionKey;
    };
    Environment.prototype.resolveFile = function (bucketId, fileId, filePath, options) {
        var downloader = download_1.default(this.config, bucketId, fileId);
        return downloader;
    };
    return Environment;
}());
exports.Environment = Environment;
