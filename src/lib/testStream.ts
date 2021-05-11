import { Transform } from 'stream';

export class TestStream extends Transform {
  public totalBytes: number;
  public totalSize: number;
  public offset: number;
  public endPosition: number;
  public startPosition: number;

  constructor(totalSize: number) {
    super({ highWaterMark: 17000 , readableHighWaterMark: 17000, writableHighWaterMark: 17000 });
    this.totalBytes = 0;
    this.offset = 0;
    this.totalSize = totalSize;
    this.startPosition = 0;
    this.endPosition = 100;
  }

  _pushChunk(chunk: Buffer, cb: any): void {

    let wait = false;

    for (let i = 0; i < chunk.length; i += 100) {

        if (this.push(this.takeSliceOf(chunk, 100)) === false) {
            // buffer full
            this.pause();
            wait = true;
            this.once('drain', () => {
                // buffer ready to continue
                // retry last push
                this.startPosition -= 100;
                wait = false;
            });

            console.log(`stopped in ${this.startPosition} bytes`);
            console.log('waiting until buffer emits drain');

            while (wait) { }

            console.log('continuing');

        }
    }

  }

  _transform(chunk: Buffer, enc: any, cb: any): void {
    console.log(chunk.length);
    this._pushChunk(chunk, cb);
  }

  takeSliceOf(chunk: Buffer, sliceSize: number): Buffer {
    const slicedBuffer = chunk.slice(this.startPosition, this.startPosition + sliceSize);
    this.startPosition += sliceSize;
    return slicedBuffer;
  }

  _flush(cb: any) {
    cb(null);
  }
}

export default TestStream;
