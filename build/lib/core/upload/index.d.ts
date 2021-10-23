import { ActionState, EnvironmentConfig } from '../../../api';
import { UploadStrategy } from './strategy';
export * from './strategy';
export * from './oneStreamStrategy';
export declare type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
export declare type UploadFinishCallback = (err: Error | null, response: string | null) => void;
export interface UploadOptions {
    progressCallback: UploadProgressCallback;
    finishedCallback: UploadFinishCallback;
    /**
     * Name of the content uploaded to the network. This name will be encrypted
     */
    name: string;
}
declare type FileId = string;
/**
 * Upload entry point
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 *
 * @returns {FileId} The id of the created file
 */
export declare function upload(config: EnvironmentConfig, filename: string, bucketId: string, params: UploadOptions, actionState: ActionState, uploader: UploadStrategy): Promise<FileId>;
