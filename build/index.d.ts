/// <reference types="node" />
import { Readable } from 'stream';
import * as Winston from 'winston';
import { ActionState } from './api/ActionState';
import { WebDownloadFileOptions } from './api/adapters/Web';
export declare type OnlyErrorCallback = (err: Error | null) => void;
export declare type UploadFinishCallback = (err: Error | null, response: string | null) => void;
export declare type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export declare type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;
export declare type DecryptionProgressCallback = (progress: number, decryptedBytes: number | null, totalBytes: number | null) => void;
export declare type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
export interface UploadFileOptions {
    progressCallback: UploadProgressCallback;
    finishedCallback: UploadFinishCallback;
}
export interface ResolveFileOptions {
    progressCallback: DownloadProgressCallback;
    finishedCallback: OnlyErrorCallback;
    overwritte?: boolean;
}
export interface DownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: DownloadFinishedCallback;
}
declare type GetInfoCallback = (err: Error | null, result: any) => void;
declare type GetBucketsCallback = (err: Error | null, result: any) => void;
declare type GetBucketIdCallback = (err: Error | null, result: any) => void;
declare type CreateBucketCallback = (err: Error | null, result: any) => void;
declare type DeleteBucketCallback = (err: Error | null, result: any) => void;
declare type ListFilesCallback = (err: Error | null, result: any) => void;
declare type DeleteFileCallback = (err: Error | null, result: any) => void;
declare type DebugCallback = (message: string) => void;
interface UploadFileParams {
    filename: string;
    fileSize: number;
    fileContent: Blob;
    progressCallback: UploadProgressCallback;
    finishedCallback: UploadFinishCallback;
}
interface StoreFileParams extends UploadFileOptions {
    debug?: DebugCallback;
    filename?: string;
}
interface ResolveFileParams extends DownloadFileOptions {
    debug?: DebugCallback;
}
export declare class Environment {
    config: EnvironmentConfig;
    logger: Winston.Logger;
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
    downloadFile(bucketId: string, fileId: string, options: WebDownloadFileOptions): ActionState;
    /**
     * Uploads a file from a web browser
     * @param bucketId Bucket id where file is going to be stored
     * @param params Upload file params
     */
    uploadFile(bucketId: string, params: UploadFileParams): void;
    /**
     * Uploads a file from file system
     * @param bucketId Bucket id where file is going to be stored
     * @param params Store file params
     */
    storeFile(bucketId: string, filepath: string, params: StoreFileParams): ActionState;
    /**
     * Cancels a file upload
     * @param {ActionState} state Upload state
     */
    storeFileCancel(state: ActionState): void;
    /**
     * Downloads a file, returns state object
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be downloaded
     * @param filePath File path where the file maybe already is
     * @param options Options for resolve file case
     */
    resolveFile(bucketId: string, fileId: string, filepath: string, params: ResolveFileParams): ActionState;
    /**
     * Cancels the download
     * @param state Download file state at the moment
     */
    resolveFileCancel(state: ActionState): void;
}
export interface EnvironmentConfig {
    bridgeUrl?: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey?: string;
    logLevel?: number;
    webProxy?: string;
    useProxy?: boolean;
    config?: {
        shardRetry: number;
        maxConcurrency: number;
    };
}
export {};
