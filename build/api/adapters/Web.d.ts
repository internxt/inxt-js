/// <reference types="node" />
import { DecryptionProgressCallback, DownloadFileOptions, DownloadProgressCallback } from "../..";
export declare type WebDownloadFinishedCallback = (err: Error | null, file: Blob | null) => void;
export interface WebDownloadFileOptions {
    fileToken?: string;
    fileEncryptionKey?: Buffer;
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: WebDownloadFinishedCallback;
}
export declare function adapt(options: WebDownloadFileOptions): DownloadFileOptions;
