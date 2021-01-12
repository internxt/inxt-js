import { Transform } from 'stream'
import { createCipheriv, Cipher} from 'crypto'

export class EncryptStream extends Transform {
  private cipher: Cipher

  constructor(key: Buffer, iv: Buffer) {
    super()
    this.cipher = createCipheriv('aes-256-ctr', key, iv)
  }

  _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void): void {
    this.cipher.write(chunk);
    cb(null, this.cipher.read());
  }

  _flush(cb: (err: Error | null, data: Buffer) => void) {
    cb(null, this.cipher.read())
  }
}

export default EncryptStream