import { throws } from "assert/strict";
import { ErrorCallback, queue, QueueObject } from "async";
import { EventEmitter, Transform, TransformOptions } from "stream";

import { FileObjectUpload } from "../../api/FileObjectUpload";
import { ripemd160, sha256 } from "../crypto";
import { ShardMeta } from "../shardMeta";
import { ConcurrentQueue } from "../concurrentQueue";
import { logger } from "../utils/logger";

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

                this.emit('shard-uploaded');
                cb(null, null);
            })
            .catch((err) => {
                cb(err, null);
            });
    }

    _flush(cb: () => void) {
        cb();

        this.emit('end');
    }
}

type UploadTask = () => {};

export interface UploadRequest {
    content: Buffer;
    index: number;
    finishCb?: (result?: any) => void
}

// export class Uploader extends EventEmitter {
//     private expectedUploads: number;
//     private fileObject: FileObjectUpload;
//     private finishedTasks = 0;
//     private uploadsQueue: QueueObject<UploadRequest>;

//     uploads: ShardMeta[] = [];

//     constructor(parallelUploads = 1, expectedUploads = 1, fileObject: FileObjectUpload) {
//         super();

//         this.expectedUploads = expectedUploads;
//         this.fileObject = fileObject;
//         this.uploadsQueue = queue(this.upload.bind(this), parallelUploads);
//     }

//     upload(req: UploadRequest, cb: ErrorCallback<Error>) {
//         console.log('UPLOADING SHARD %s', req.index);

//         return this.fileObject.uploadShard(req.content, req.content.length, this.fileObject.frameId, req.index, 3, false)
//             .then((shardMeta) => {
//                 this.uploads.push(shardMeta);
//                 this.emit('upload-progress', req.content.length);

//                 this.emit('shard-uploaded');
//                 cb(null);
//             })
//             .catch((err) => {
//                 cb(err);
//             })
//             .finally(() => {
//                 if (req.finishCb) {
//                     req.finishCb();
//                 }

//                 this.finishedTasks++;

//                 console.log('SHARD UPLOAD END %s', req.index);
//             });
//     }

//     getShardsMeta(): ShardMeta[] {
//         return this.uploads;
//     }

//     push(content: Buffer, index: number, handleProgress?: (result?: any) => void): Promise<void> {
//         return this.uploadsQueue.push({ content, index, finishCb: handleProgress });
//     }

//     end(): void {
//         const intervalId = setInterval(() => {
//             console.log('FINISHED TASKS %s. EXPECTED UPLOADS %s', this.finishedTasks, this.expectedUploads);

//             if (this.finishedTasks === this.expectedUploads) {
//                 clearInterval(intervalId);
//                 this.emit('end');
//             }
//         }, 500);
//     }
// }

export class UploaderQueue extends ConcurrentQueue<UploadRequest> {
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(parallelUploads = 1, expectedUploads = 1, fileObject: FileObjectUpload) {
    super(parallelUploads, expectedUploads, UploaderQueue.upload(fileObject));
  }

  private static upload(fileObject: FileObjectUpload) {
    return (req: UploadRequest) => {
      return fileObject.uploadShard(req.content, req.content.length, fileObject.frameId, req.index, 3, false)
        .then((shardMeta) => {
          fileObject.shardMetas.push(shardMeta);
        })
        .finally(() => {
          if (req.finishCb) {
            req.finishCb();
          }
        });
    };
  }

  emit(event: string, ...args: any[]) {
    this.eventEmitter.emit(event, args);
  }

  getListenerCount(event: string) {
    return this.eventEmitter.listenerCount(event);
  }

  getListeners(event: string) {
    return this.eventEmitter.listeners(event);
  }

  on(event: string, listener: (...args: any[]) => void): UploaderQueue {
    this.eventEmitter.on(event, listener);

    return this;
  }

  end(cb?: () => void) {
    super.end(() => {
      if (cb) {
        cb();
      }
      this.emit('end');
    });
  }
}
