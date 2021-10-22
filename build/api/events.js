"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = void 0;
var DownloadStrategy_1 = require("../lib/download/DownloadStrategy");
var UploadStrategy_1 = require("../lib/upload/UploadStrategy");
exports.Events = {
    Upload: UploadStrategy_1.UploadEvents,
    Download: DownloadStrategy_1.DownloadEvents
};
