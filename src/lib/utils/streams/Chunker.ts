import { Transform } from 'stream';

export class ChunkSizeTransform extends Transform {
  private chunkSize: number;
  private buffer: Buffer;

  constructor(chunkSize: number) {
    super();
    this.chunkSize = chunkSize;
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk: Buffer, encoding: string, callback: () => void) {
    // Append the incoming chunk to the buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Process the buffer in chunks of the specified size
    while (this.buffer.length >= this.chunkSize) {
      const chunkToSend = this.buffer.slice(0, this.chunkSize);
      this.buffer = this.buffer.slice(this.chunkSize);

      // Push the chunk downstream
      this.push(chunkToSend);
    }

    callback();
  }

  _flush(callback: () => void) {
    // Push any remaining data in the buffer
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}
