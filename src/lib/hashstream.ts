import stream from 'stream'
import crypto from 'crypto'
import { sha256HashBuffer } from './crypto'

export class HashStream extends stream.Transform {
  private hasher: crypto.Hash
  private length: number
  private flushed: boolean = false
  private finalHash: Buffer | null
  private expectedSize: number = 1

  constructor(expectedSize?: number) {
    super()
    this.hasher = sha256HashBuffer()
    this.length = 0
    this.finalHash = Buffer.alloc(0)
    this.expectedSize = expectedSize || 1
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: any) {
    this.hasher.update(chunk)
    this.length += chunk.length
    this.emit('percentage', this.length * 100 / this.expectedSize)
    console.log(this.length)
    callback(null, chunk)
  }

  _flush() {
    this.hasher.end()
    this.emit('end')
  }

  read(): Buffer {
    return this.finalHash = this.hasher.read()
  }

}