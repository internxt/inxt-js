import { CreateEntryFromFrameResponse } from './services/request';
export interface OnlyErrorCallback {
    (err: Error | null): void;
}
export interface UploadFinishCallback {
    (err: Error | null, response: CreateEntryFromFrameResponse | null): void;
}
export interface DownloadProgressCallback {
    (progress: number, downloadedBytes: number | null, totalBytes: number | null): void;
}
export interface UploadProgressCallback {
    (progress: number, uploadedBytes: number | null, totalBytes: number | null): void;
}
export interface ResolveFileOptions {
    progressCallback: DownloadProgressCallback;
    finishedCallback: OnlyErrorCallback;
    overwritte?: boolean;
}
export interface DownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    finishedCallback: OnlyErrorCallback;
}
interface GetInfoCallback {
    (err: Error | null, result: any): void;
}
interface GetBucketsCallback {
    (err: Error | null, result: any): void;
}
interface GetBucketIdCallback {
    (err: Error | null, result: any): void;
}
interface CreateBucketCallback {
    (err: Error | null, result: any): void;
}
interface DeleteBucketCallback {
    (err: Error | null, result: any): void;
}
interface ListFilesCallback {
    (err: Error | null, result: any): void;
}
interface DeleteFileCallback {
    (err: Error | null, result: any): void;
}
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
    downloadFile(bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Blob>;
    uploadFile(bucketId: string, data: UploadFileParams): void;
    /**
     * Downloads a file, returns state object
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be downloaded
     * @param filePath File path where the file maybe already is
     * @param options Options for resolve file case
     */
    resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): void;
    /**
     * Cancels the upload
     * @param state Download file state at the moment
     */
    resolveFileCancel(state: any): void;
}
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
