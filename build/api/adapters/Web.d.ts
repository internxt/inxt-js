import { DecryptionProgressCallback, DownloadFileOptions, DownloadProgressCallback } from "../..";
export declare type WebDownloadFinishedCallback = (err: Error | null, file: Blob | null) => void;
export interface WebDownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: WebDownloadFinishedCallback;
}
/**
 * Adapts web download options to std file download options
 * @param options web download file options
 * @returns adapted options to std file download options
 */
export declare const DownloadOptionsAdapter: (options: WebDownloadFileOptions) => DownloadFileOptions;
