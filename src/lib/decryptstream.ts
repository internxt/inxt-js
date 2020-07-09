import { Transform } from 'stream'
import { createDecipheriv, Decipher } from 'crypto'

/**
 * Creates a new stream to decrypt one file
 */
export class DecryptStream extends Transform {
  private decipher: Decipher
  private totalBytesDecrypted: number = 0
  constructor(key: Buffer, iv: Buffer) {
    super()
    this.decipher = createDecipheriv('aes-256-ctr', key, iv)
  }

  _transform = (chunk: Buffer, enc: any, callback: any) => {
    this.decipher.write(chunk)
    this.totalBytesDecrypted += chunk.length
    this.emit('decrypted-bytes', this.totalBytesDecrypted)
    callback(null, this.decipher.read())
  }

  _flush = (callback: any) => {
    this.emit('end')
    callback(null, this.decipher.read())
  }
}

export default DecryptStream