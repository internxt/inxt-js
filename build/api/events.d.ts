import { DownloadEvents } from "../lib/download/DownloadStrategy";
declare enum UploadEvents {
    Abort = "upload-aborted"
}
export declare const Events: {
    Upload: typeof UploadEvents;
    Download: typeof DownloadEvents;
};
export {};
