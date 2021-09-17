import * as Winston from 'winston';
import { EnvironmentConfig, UploadFileOptions } from "../..";
import { ActionState } from "../../api/ActionState";
import { FileMeta } from "../../api/FileObjectUpload";
import { UploadStrategy } from './UploadStrategy';
/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export declare function upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, params: UploadFileOptions, debug: Winston.Logger, actionState: ActionState): Promise<void>;
export declare function uploadV2(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, params: UploadFileOptions, debug: Winston.Logger, actionState: ActionState, uploader: UploadStrategy): Promise<void>;
