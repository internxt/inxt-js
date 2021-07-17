import { EventEmitter } from "stream";

import { FileObjectUpload } from "../../api/FileObjectUpload";
import { ConcurrentQueue } from "../concurrentQueue";
export interface UploadRequest {
  content: Buffer;
  index: number;
  finishCb?: (result?: any) => void
}

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
