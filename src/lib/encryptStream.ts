import { Transform } from 'stream';
import { createCipheriv, Cipher } from 'crypto';

interface RawShard {
  size: number;
  index: number;
}

export class EncryptStream extends Transform {
  private cipher: Cipher;
  public shards: RawShard [] = [];
  private indexCounter = 0;

  constructor(key: Buffer, iv: Buffer, cipher?: Cipher) {
    super();
    this.cipher = cipher ?? createCipheriv('aes-256-ctr', key, iv);
  }

  _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void): void {
    this.cipher.write(chunk);

    this.shards.push({ size: chunk.byteLength, index: this.indexCounter });
    this.indexCounter++;

    cb(null, this.cipher.read());
  }

  _flush(cb: (err: Error | null, data: Buffer) => void) {
    cb(null, this.cipher.read());
  }
}

export default EncryptStream;
