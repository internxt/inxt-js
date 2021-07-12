import * as Winston from 'winston';
import { EnvironmentConfig, UploadFileOptions } from "../..";
import { ActionState } from "../../api/ActionState";
import { FileMeta } from "../../api/FileObjectUpload";
/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export declare function upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, params: UploadFileOptions, logger: Winston.Logger, actionState: ActionState): Promise<void>;
