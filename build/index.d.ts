import * as Winston from 'winston';
import { UploadStrategyFunction, DownloadFunction } from './lib/core';
import { GenerateFileKey } from './lib/utils/crypto';
import { ActionState, EnvironmentConfig } from './api';
import { FileInfo } from './api/fileinfo';
import { HashStream } from './lib/utils/streams';
declare type GetBucketsCallback = (err: Error | null, result: any) => void;
declare type GetBucketIdCallback = (err: Error | null, result: any) => void;
declare type CreateBucketCallback = (err: Error | null, result: any) => void;
declare type DeleteBucketCallback = (err: Error | null, result: any) => void;
declare type ListFilesCallback = (err: Error | null, result: any) => void;
declare type DeleteFileCallback = (err: Error | null, result: any) => void;
export declare class Environment {
    config: EnvironmentConfig;
    logger: Winston.Logger;
    static utils: {
        generateFileKey: typeof GenerateFileKey;
        Hasher: typeof HashStream;
    };
    constructor(config: EnvironmentConfig);
    /**
     * Gets file info
     * @param bucketId Bucket id where file is stored
     * @param fileId
     * @returns file info
     */
    getFileInfo(bucketId: string, fileId: string): Promise<FileInfo>;
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
     * Creates file token
     * @param bucketId Bucket id where file is stored
     * @param fileId File id
     * @param operation
     * @param cb
     */
    createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): Promise<string>;
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
    upload: UploadStrategyFunction;
    download: DownloadFunction;
    downloadCancel(state: ActionState): void;
    uploadCancel(state: ActionState): void;
    renameFile(bucketId: string, fileId: string, newPlainName: string): Promise<void>;
}
export {};
