export * from './upload';
export * from './download';
declare enum DownloadEvents {
    Error = "download-error",
    Start = "download-start",
    Ready = "download-ready",
    Progress = "download-progress",
    Abort = "download-abort",
    Finish = "download-finish"
}
declare enum UploadEvents {
    Error = "upload-error",
    Started = "upload-start",
    Progress = "upload-progress",
    Abort = "upload-aborted",
    Finished = "upload-finished",
    ShardUploadSuccess = "shard-upload-success"
}
export declare const Events: {
    Upload: typeof UploadEvents;
    Download: typeof DownloadEvents;
};
