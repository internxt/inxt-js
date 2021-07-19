"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILEOBJECT = exports.FILEMUXER = exports.ENCRYPT = exports.Decrypt = exports.DECRYPT = exports.UPLOAD = exports.Download = exports.DOWNLOAD = void 0;
var DOWNLOAD;
(function (DOWNLOAD) {
    DOWNLOAD["PROGRESS"] = "download-progress";
    DOWNLOAD["ERROR"] = "download-error";
    DOWNLOAD["END"] = "download-end";
})(DOWNLOAD = exports.DOWNLOAD || (exports.DOWNLOAD = {}));
var Download;
(function (Download) {
    Download["Progress"] = "download-progress";
    Download["Error"] = "download-error";
    Download["End"] = "download-end";
})(Download = exports.Download || (exports.Download = {}));
var UPLOAD;
(function (UPLOAD) {
    UPLOAD["PROGRESS"] = "upload-progress";
    UPLOAD["ERROR"] = "upload-error";
    UPLOAD["END"] = "upload-end";
})(UPLOAD = exports.UPLOAD || (exports.UPLOAD = {}));
var DECRYPT;
(function (DECRYPT) {
    DECRYPT["PROGRESS"] = "decrypt-progress";
    DECRYPT["ERROR"] = "decrypt-error";
    DECRYPT["END"] = "decrypt-end";
})(DECRYPT = exports.DECRYPT || (exports.DECRYPT = {}));
var Decrypt;
(function (Decrypt) {
    Decrypt["Progress"] = "decrypt-progress";
    Decrypt["Error"] = "decrypt-error";
    Decrypt["End"] = "decrypt-end";
})(Decrypt = exports.Decrypt || (exports.Decrypt = {}));
var ENCRYPT;
(function (ENCRYPT) {
    ENCRYPT["PROGRESS"] = "encrypt-progress";
    ENCRYPT["ERROR"] = "encrypt-error";
    ENCRYPT["END"] = "encrypt-end";
})(ENCRYPT = exports.ENCRYPT || (exports.ENCRYPT = {}));
var FILEMUXER;
(function (FILEMUXER) {
    FILEMUXER["PROGRESS"] = "filemuxer-progress";
    FILEMUXER["DATA"] = "filemuxer-data";
    FILEMUXER["ERROR"] = "filemuxer-error";
    FILEMUXER["END"] = "filemuxer-end";
})(FILEMUXER = exports.FILEMUXER || (exports.FILEMUXER = {}));
var FILEOBJECT;
(function (FILEOBJECT) {
    FILEOBJECT["PROGRESS"] = "fileobject-progress";
    FILEOBJECT["ERROR"] = "fileobject-error";
    FILEOBJECT["END"] = "fileobject-end";
})(FILEOBJECT = exports.FILEOBJECT || (exports.FILEOBJECT = {}));
