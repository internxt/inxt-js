"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = void 0;
__exportStar(require("./upload"), exports);
__exportStar(require("./download"), exports);
var DownloadEvents;
(function (DownloadEvents) {
    DownloadEvents["Error"] = "download-error";
    DownloadEvents["Start"] = "download-start";
    DownloadEvents["Ready"] = "download-ready";
    DownloadEvents["Progress"] = "download-progress";
    DownloadEvents["Abort"] = "download-abort";
    DownloadEvents["Finish"] = "download-finish";
})(DownloadEvents || (DownloadEvents = {}));
var UploadEvents;
(function (UploadEvents) {
    UploadEvents["Error"] = "upload-error";
    UploadEvents["Started"] = "upload-start";
    UploadEvents["Progress"] = "upload-progress";
    UploadEvents["Abort"] = "upload-aborted";
    UploadEvents["Finished"] = "upload-finished";
    UploadEvents["ShardUploadSuccess"] = "shard-upload-success";
})(UploadEvents || (UploadEvents = {}));
exports.Events = {
    Upload: UploadEvents,
    Download: DownloadEvents
};
