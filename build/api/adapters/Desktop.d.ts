/// <reference types="node" />
import { Readable } from "stream";
import { DecryptionProgressCallback, DownloadFileOptions, DownloadProgressCallback } from "../..";
export declare type DesktopDownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export interface DesktopDownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: DesktopDownloadFinishedCallback;
}
export interface DesktopUploadFileOptions {
}
/**
 * Adapts Desktop download options to std file download options
 * @param options Desktop download file options
 * @returns adapted options to std file download options
 */
export declare const DownloadOptionsAdapter: (options: DesktopDownloadFileOptions) => DownloadFileOptions;
export declare const UploadOptionsAdapter: (options: DesktopUploadFileOptions) => void;
