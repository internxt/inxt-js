import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import { ShardMeta } from '../shardMeta';
import { CreateEntryFromFrameBody } from '../../services/request';
/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export declare function Upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, progress: UploadProgressCallback, finish: UploadFinishCallback): Promise<void>;
export declare function createBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): Promise<void | import("../../services/request").CreateEntryFromFrameResponse>;
export declare function generateBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody;
