import { Transform, TransformOptions } from "stream";

import { FileObjectUpload } from "../../api/FileObjectUpload";
import { ripemd160, sha256 } from "../crypto";
import { ShardMeta } from "../shardMeta";

export class UploaderStream extends Transform {
    private parallelUploads: number;
    private fileObject: FileObjectUpload;
    private indexCounter = 0;

    private pendingShards: Buffer[] = [];
    private maxConcurrentBytes: number;
    private limitOffset = 0;

    uploads: ShardMeta[] = [];

    constructor(parallelUploads = 1, fileObject: FileObjectUpload, shardSize: number, maxConcurrentBytes?: number, options?: TransformOptions) {
        super(options);

        this.parallelUploads = parallelUploads;
        this.fileObject = fileObject;

        this.maxConcurrentBytes = maxConcurrentBytes || shardSize;
    }

    getShardsMeta(): ShardMeta[] {
        return this.uploads;
    }

    _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer | null) => void): void {
        if (this.parallelUploads > 1) {
            // TODO
            return cb(null, null);
        }

        // console.log('Uploading shard %s chunkSize %s', this.indexCounter, chunk.length);
        this.fileObject.uploadShard(chunk, chunk.length, this.fileObject.frameId, this.indexCounter++, 3, false)
            .then((shardMeta) => {
                this.uploads.push(shardMeta);
                this.emit('upload-progress', chunk.length);

                // console.log('Shard with index %s uploaded', this.indexCounter - 1);
                cb(null, null);
            })
            .catch((err) => {
                cb(err, null);
            });
    }

    _flush(cb: () => void) {
        cb();
    }
}
