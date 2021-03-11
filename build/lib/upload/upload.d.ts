import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { FileMeta } from "../../api/FileObjectUpload";
/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export declare function Upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, progress: UploadProgressCallback, finish: UploadFinishCallback): void;
