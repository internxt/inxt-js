import { Transform, TransformOptions } from "stream";

export enum TapEvents {
  Opened = 'tap-opened',
  Closed = 'tap-closed'
}

type ContinueCallback = (err: Error | null) => void;

// preconditions: 
// diameterSize >= chunk size on each transform
export class Tap extends Transform {
  private diameterSize: number;
  private bytesRead = 0;
  private temporalBuffer = Buffer.alloc(0);

  private pausedInterval: NodeJS.Timeout = setTimeout(() => null, 1);
  private shouldContinue = false;

  constructor(diameterSize: number, options?: TransformOptions) {
    super(options);

    this.diameterSize = diameterSize;
  }

  _transform(chunk: Buffer, enc: string, done: ContinueCallback): void {
    if (chunk.length > this.diameterSize) {
      done(new Error('TapStreamError: Chunk length is bigger than diameter size'));

      return;
    }

    // console.log('diameterSize: %s, bytesRead: %s, incoming chunkSize: %s', this.diameterSize, this.bytesRead, chunk.length);

    if (this.temporalBuffer.length > 0) {
      const diffToRefill = this.diameterSize - this.temporalBuffer.length;

      this.pump(Buffer.concat([ this.temporalBuffer, chunk.slice(0, diffToRefill) ]));

      this.bytesRead = 0;
      this.temporalBuffer = Buffer.alloc(0);

      chunk = chunk.slice(diffToRefill);
    }

    if (chunk.length > this.diameterSize - this.bytesRead) {
      // console.log('chunk cannot be pushed at all');

      if (this.diameterSize - this.bytesRead > 0) {
        // console.log('pushing from byte 0 to byte %s', this.diameterSize - this.bytesRead - 1);
        // console.log('bytes %s', this.diameterSize - this.bytesRead);
        // console.log('saving from byte %s to byte %s', this.diameterSize - this.bytesRead, chunk.length);

        this.temporalBuffer = chunk.slice(this.diameterSize - this.bytesRead);
        this.pump(chunk.slice(0, this.diameterSize - this.bytesRead));
      }
      this.close(done);
    } else {
      this.pump(chunk);
      done(null);
    }
  }

  pump(b: Buffer) {
    this.bytesRead += b.length;
    this.push(b);
  }

  open() {
    this.emit(TapEvents.Opened);

    console.log('opening tap');

    this.shouldContinue = true;
  }

  close(cb: ContinueCallback) {
    this.emit(TapEvents.Closed);

    console.log('closing tap');

    this.pausedInterval = setInterval(() => {
      if (this.shouldContinue) {
        console.log('continuing');
        cb(null);
        clearInterval(this.pausedInterval);

        this.shouldContinue = false;
      } else {
        // console.log('not continuing');
      }
    }, 50);
  }

  _flush(done: () => void): void {
    if (this.temporalBuffer.length > 0) {
      this.pump(this.temporalBuffer);
    }
    done();
  }
}
