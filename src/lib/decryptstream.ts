import { createDecipheriv, Decipher } from 'crypto'

import { ShardObject } from '../api/ShardObject'
export class DecryptStream {
  private decipher: Decipher

  private SFiles = new Map<number, Buffer>()
  private currentIndex = 0
  private finalBuffer: Buffer[] = []

  constructor(key: Buffer, iv: Buffer) {
    this.decipher = createDecipheriv('aes-256-ctr', key, iv)
  }

  push(index: number, shardData?: Buffer): void {
    if (shardData) {
      this.SFiles?.set(index, shardData)
    }

    if (index === this.currentIndex && this.SFiles.has(index)) {
      const shardValue = this.SFiles.get(index)
      if (shardValue) {
        console.log('UPDATED', index, shardValue)
        this.finalBuffer.push(this.decipher.update(shardValue))
        this.SFiles.delete(index)
        this.currentIndex++
        this.push(this.currentIndex)
      }
    }
  }

  final(): Buffer {
    return Buffer.concat([...this.finalBuffer, this.decipher.final()])
  }
}

export default DecryptStream