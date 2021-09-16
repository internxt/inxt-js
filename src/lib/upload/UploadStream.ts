import { PassThrough, Readable } from "stream";
import { EventEmitter } from "events";

import { ConcurrentQueue } from "../concurrentQueue";
import { Abortable } from "../../api/Abortable";

export interface UploadTaskParams {
  shardIndex: number;
  stream: Readable;
  finishCb: () => void;
}

export enum Events {
  Error = 'uploader-queue-error',
  Progress  = 'uploader-queue-progress',
  End = 'uploader-queue-end'
}

type UploadTask = (content: UploadTaskParams) => Promise<any>;

export class UploaderQueueV2 extends ConcurrentQueue<UploadTaskParams> implements Abortable {
  private eventEmitter = new EventEmitter();
  private passthrough = new PassThrough();
  private shardIndex = 0;
  private concurrentUploads = 0;
  concurrency = 0;

  constructor(
    parallelUploads = 1,
    expectedUploads = 1,
    task: UploadTask
  ) {
    super(parallelUploads, expectedUploads, task);
    this.concurrency = parallelUploads;

    this.passthrough.on('data', this.handleData.bind(this));
    this.passthrough.on('end', this.end.bind(this));
    this.passthrough.on('error', (err) => this.emit(Events.Error, err));
  }

  getUpstream(): PassThrough {
    return this.passthrough;
  }

  handleData(chunk: Buffer) {
    this.concurrentUploads++;

    if (this.concurrentUploads === this.concurrency) {
      this.passthrough.pause();
    }

    const currentShardIndex = this.shardIndex;

    const finishCb = () => {
      this.concurrentUploads--;
      this.emit(Events.Progress, currentShardIndex);

      if (this.passthrough.isPaused()) {
        this.passthrough.resume();
      }
    };

    this.push({ shardIndex: this.shardIndex, stream: Readable.from(chunk), finishCb });

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

  removeAllListeners(): void {
    this.eventEmitter.removeAllListeners();
  }

  end(cb?: () => void): void {
    super.end(() => {
      if (cb) {
        cb();
      }
      this.emit(Events.End);
    });
  }

  destroy(): void {
    this.removeAllListeners();
  }

  abort(): void {
    this.destroy();
    this.passthrough.destroy();
    this.queue.kill();
  }
}
