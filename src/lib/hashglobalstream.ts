import { sha512HmacBuffer } from './crypto'
import { Hmac } from 'crypto'

export class GlobalHash {
  private hasher: Hmac
  private currentIndex = 0

  private HKeys: Map<number, Buffer> = new Map<number, Buffer>()

  constructor(key: Buffer | string) {
    if (key instanceof String) {
      key = Buffer.from(key)
    }
    this.hasher = sha512HmacBuffer(key)
  }

  push(index: number, hash?: Buffer): void {
    if (hash) {
      this.HKeys?.set(index, hash)
    }

    if (index === this.currentIndex && this.HKeys.has(index)) {
      const hashValue = this.HKeys.get(index)
      if (hashValue) {
        this.hasher.update(hashValue)
        this.HKeys.delete(index)
        this.currentIndex++
        this.push(this.currentIndex)
      }
    }
  }

  digest(): Buffer {
    this.HKeys.clear()
    return this.hasher.digest()
  }
}
