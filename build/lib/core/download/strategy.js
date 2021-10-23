"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadStrategy = void 0;
var events_1 = require("events");
var DownloadStrategy = /** @class */ (function (_super) {
    __extends(DownloadStrategy, _super);
    function DownloadStrategy() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.fileEncryptionKey = Buffer.alloc(0);
        _this.iv = Buffer.alloc(0);
        return _this;
    }
    /**
     * Should return the initialization vector used for file encryption
     */
    DownloadStrategy.prototype.getIv = function () {
        return this.iv;
    };
    /**
     * Should set the required iv to perform an encryption
     * @param iv Initialization vector used in file encryption
     */
    DownloadStrategy.prototype.setIv = function (iv) {
        this.iv = iv;
    };
    /**
     * Should return the file encryption key
     */
    DownloadStrategy.prototype.getFileEncryptionKey = function () {
        return this.fileEncryptionKey;
    };
    /**
     * Should set the file encryption key
     * @param fk File encryption key used to encrypt a file
     */
    DownloadStrategy.prototype.setFileEncryptionKey = function (fk) {
        this.fileEncryptionKey = fk;
    };
    return DownloadStrategy;
}(events_1.EventEmitter));
exports.DownloadStrategy = DownloadStrategy;
