import { sha512HmacBuffer } from './crypto'
import { Hmac } from 'crypto'

export class GlobalHash {
  private hasher: Hmac
  private currentIndex: number = 0

  private HKeys: Map<number, Buffer> | null = new Map<number, Buffer>()

  constructor(key: Buffer | String) {
    if (key instanceof String) {
      key = Buffer.from(key)
    }
    this.hasher = sha512HmacBuffer(key)
  }

  push(index: number, hash?: Buffer) {
    if (hash) {
      this.HKeys?.set(index, hash)
    }

    if (index === this.currentIndex && this.HKeys?.has(index)) {
      this.hasher.update(this.HKeys.get(index)!)
      this.HKeys.delete(index)
      this.currentIndex++
      this.push(this.currentIndex)
    }
  }

  digest() {
    this.HKeys?.clear()
    this.HKeys = null
    return this.hasher.digest()
  }
}