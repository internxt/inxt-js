import { Transform, TransformOptions } from 'stream';

export enum Events {
  Progress = 'progress',
}

export class ProgressNotifier extends Transform {
  private readBytes = 0;
  private progressInterval: NodeJS.Timeout;

  constructor(totalBytes: number, interval?: number, opts?: TransformOptions) {
    super(opts);

    this.progressInterval = setInterval(() => {
      if (this.readBytes > 0) {
        this.emit(Events.Progress, this.readBytes / totalBytes);
      }
    }, interval ?? 10);
  }

  _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void) {
    this.readBytes += chunk.length;

    cb(null, chunk);
  }

  _flush(cb: (err: Error | null) => void) {
    clearInterval(this.progressInterval);
    cb(null);
  }

  _destroy(error: Error | null, cb: (error: Error | null) => void) {
    clearInterval(this.progressInterval);
    cb(error);
  }
}
