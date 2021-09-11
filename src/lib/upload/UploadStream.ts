import { PassThrough, Readable } from "stream";
import { EventEmitter } from "events";
import { ConcurrentQueue } from "../concurrentQueue";
import { wrap } from "../utils/error";

export interface UploadTaskParams {
  hostname: string;
  path: string;
  stream: Readable;
  finishCb: () => void;
}

type UploadTask = (content: UploadTaskParams) => Promise<any>;
type GetPath = (index: number) => string;
type GetHostname = () => string;

export class UploaderQueueV2 extends ConcurrentQueue<UploadTaskParams> {
  private eventEmitter = new EventEmitter();
  private passthrough = new PassThrough();
  private shardIndex = 0;
  private concurrentUploads = 0;
  concurrency = 0;

  private getPath: GetPath;
  private getHostname: GetHostname;

  constructor(
    parallelUploads = 1,
    expectedUploads = 1,
    task: UploadTask,
    getPath: GetPath,
    getHostname: GetHostname
  ) {
    super(parallelUploads, expectedUploads, task);
    this.concurrency = parallelUploads;
    this.getHostname = getHostname;
    this.getPath = getPath;

    this.passthrough.on('data', this.handleData.bind(this));
    this.passthrough.on('end', this.end.bind(this));
    this.passthrough.on('error', (err) => {
      this.emit('error', wrap('Farmer request error', err));
    });
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
      this.emit('upload-progress', this.shardIndex - 1);

      if (this.passthrough.isPaused()) {
        this.passthrough.resume();
      }
    };

    this.push({
      stream: Readable.from(chunk),
      path: this.getPath(this.shardIndex),
      hostname: this.getHostname(),
      finishCb
    });

    this.shardIndex++;
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

  on(event: string, listener: (...args: any[]) => void): UploaderQueueV2 {
    this.eventEmitter.on(event, listener);

    return this;
  }

  once(event: string, listener: (...args: any[]) => void): UploaderQueueV2 {
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
