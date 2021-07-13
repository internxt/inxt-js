/// <reference types="node" />
import { Transform, TransformOptions } from "stream";
import { FileObjectUpload } from "../../api/FileObjectUpload";
import { ShardMeta } from "../shardMeta";
export declare class UploaderStream extends Transform {
    private parallelUploads;
    private fileObject;
    private indexCounter;
    private pendingShards;
    private maxConcurrentBytes;
    private limitOffset;
    uploads: ShardMeta[];
    constructor(parallelUploads: number | undefined, fileObject: FileObjectUpload, shardSize: number, maxConcurrentBytes?: number, options?: TransformOptions);
    getShardsMeta(): ShardMeta[];
    _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer | null) => void): void;
    _flush(cb: () => void): void;
}
