/// <reference types="node" />
import { CreateEntryFromFrameResponse } from './services/request';
export declare type OnlyErrorCallback = (err: Error | null) => void;
export declare type UploadFinishCallback = (err: Error | null, response: CreateEntryFromFrameResponse | null) => void;
export declare type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;
export declare type DecryptionProgressCallback = (progress: number, decryptedBytes: number | null, totalBytes: number | null) => void;
export declare type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
export interface ResolveFileOptions {
    progressCallback: DownloadProgressCallback;
    finishedCallback: OnlyErrorCallback;
    overwritte?: boolean;
}
export interface DownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: OnlyErrorCallback;
}
declare type GetInfoCallback = (err: Error | null, result: any) => void;
declare type GetBucketsCallback = (err: Error | null, result: any) => void;
declare type GetBucketIdCallback = (err: Error | null, result: any) => void;
declare type CreateBucketCallback = (err: Error | null, result: any) => void;
declare type DeleteBucketCallback = (err: Error | null, result: any) => void;
declare type ListFilesCallback = (err: Error | null, result: any) => void;
declare type DeleteFileCallback = (err: Error | null, result: any) => void;
interface UploadFileParams {
    filename: string;
    fileSize: number;
    fileContent: Blob;
    progressCallback: UploadProgressCallback;
    finishedCallback: UploadFinishCallback;
}
export declare class Environment {
    protected config: EnvironmentConfig;
    constructor(config: EnvironmentConfig);
    /**
     * Gets general API info
     * @param cb Callback that will receive api's info
     */
    getInfo(cb: GetInfoCallback): void;
    /**
     * Gets list of available buckets
     * @param cb Callback that will receive the list of buckets
     */
    getBuckets(cb: GetBucketsCallback): void;
    /**
     * Gets a bucket id by name
     * @param bucketName Name of the bucket to be retrieved
     * @param cb Callback that will receive the bucket id
     */
    getBucketId(bucketName: string, cb: GetBucketIdCallback): void;
    /**
     * Creates a bucket
     * @param bucketName Name of the new bucket
     * @param cb Callback that will receive the response after creation
     */
    createBucket(bucketName: string, cb: CreateBucketCallback): void;
    /**
     * Deletes a bucket
     * @param bucketId Id whose bucket is going to be deleted
     * @param cb Callback that will receive the response after deletion
     */
    deleteBucket(bucketId: string, cb: DeleteBucketCallback): void;
    /**
     * Deletes a file from a bucket
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be deleted
     * @param cb Callback that receives the response after deletion
     */
    deleteFile(bucketId: string, fileId: string, cb: DeleteFileCallback): void;
    /**
     * Lists files in a bucket
     * @param bucketId Bucket id whose files are going to be listed
     * @param cb Callback that receives the files list
     */
    listFiles(bucketId: string, cb: ListFilesCallback): void;
    setEncryptionKey(newEncryptionKey: string): void;
    downloadFile(bucketId: string, fileId: string, options: DownloadFileOptions): Promise<void | Blob>;
    /**
     * Uploads a file from a web browser
     * @param bucketId Bucket id where file is going to be stored
     * @param params Upload file params
     */
    uploadFile(bucketId: string, params: UploadFileParams): void;
    /**
     * Downloads a file, returns state object
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be downloaded
     * @param filePath File path where the file maybe already is
     * @param options Options for resolve file case
     */
    /**
     * Cancels the upload
     * @param state Download file state at the moment
     */
    resolveFileCancel(state: any): void;
}
export declare function rsTest(size: number): Promise<Uint8Array | Buffer>;
export interface EnvironmentConfig {
    bridgeUrl?: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey?: string;
    logLevel?: number;
    webProxy?: string;
    config?: {
        shardRetry: number;
    };
}
export {};
