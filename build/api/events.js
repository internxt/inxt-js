"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = void 0;
var DownloadStrategy_1 = require("../lib/download/DownloadStrategy");
var UploadEvents;
(function (UploadEvents) {
    UploadEvents["Abort"] = "upload-aborted";
})(UploadEvents || (UploadEvents = {}));
exports.Events = {
    Upload: UploadEvents,
    Download: DownloadStrategy_1.DownloadEvents
};
