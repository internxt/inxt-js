import { PassThrough } from "stream";
import { EventEmitter } from "events";

import { FileObjectUpload } from "../../api/FileObjectUpload";
import { ConcurrentQueue } from "../concurrentQueue";
import { wrap } from "../utils/error";

export interface UploadRequest {
  content: Buffer;
  index: number;
  finishCb?: (result?: any) => void;
}

export class UploaderQueue extends ConcurrentQueue<UploadRequest> {
  private eventEmitter = new EventEmitter();
  private passthrough: PassThrough = new PassThrough();
  private shardIndex = 0;
  private concurrentUploads = 0;
  concurrency = 0;

  constructor(parallelUploads = 1, expectedUploads = 1, fileObject: FileObjectUpload) {
    super(parallelUploads, expectedUploads, UploaderQueue.upload(fileObject));

    this.concurrency = parallelUploads;

    this.passthrough.on('data', this.handleData.bind(this));
    this.passthrough.on('end', this.end.bind(this));
    this.passthrough.on('error', (err) => {
      this.emit('error', wrap('Farmer request error', err));
    });
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

  getUpstream(): PassThrough {
    return this.passthrough;
  }

  handleData(chunk: Buffer) {
    this.concurrentUploads++;

    if (this.concurrentUploads === this.concurrency) {
      this.passthrough.pause();
    }

    const finishCb = () => {
      this.concurrentUploads--;
      this.emit('upload-progress', chunk.length);

      if (this.passthrough.isPaused()) {
        this.passthrough.resume();
      }
    };

    this.push({ content: chunk, index: this.shardIndex++, finishCb });
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

  once(event: string, listener: (...args: any[]) => void): UploaderQueue {
    this.eventEmitter.once(event, listener);

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
