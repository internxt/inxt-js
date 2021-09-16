import { Transform, TransformOptions } from 'stream';

export enum Events {
  Progress = 'progress'
}

export class ProgressNotifier extends Transform {
  private readBytes = 0;
  private progressInterval: NodeJS.Timeout;

  constructor(totalBytes: number, opts?: TransformOptions) {
    super(opts);

    this.progressInterval = setInterval(() => {
      this.emit(Events.Progress, this.readBytes / totalBytes);
    }, 10);
  }

  _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void) {
    this.readBytes += chunk.length;

    cb(null, chunk);
  }

  _flush(cb: (err: Error | null) => void) {
    clearInterval(this.progressInterval);
    cb(null);
  }
}
