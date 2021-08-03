import { DecryptionProgressCallback, DownloadProgressCallback } from "../..";
export declare type WebDownloadFinishedCallback = (err: Error | null, file: Blob | null) => void;
export interface WebDownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: WebDownloadFinishedCallback;
}
