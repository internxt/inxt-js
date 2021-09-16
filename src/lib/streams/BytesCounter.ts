import { Transform, TransformOptions } from 'stream';

export class BytesCounter extends Transform {
  private bytesCount = 0;

  constructor(opts?: TransformOptions) {
    super(opts);
  }

  get count() {
    return this.bytesCount;
  }

  _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void) {
    this.bytesCount += chunk.length;

    cb(null, chunk);
  }

  _flush(cb: (err: Error | null) => void) {
    cb(null);
  }
}
