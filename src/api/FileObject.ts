import { ShardObject } from "./ShardObject"
import { FileInfo, GetFileInfo, GetFileMirrors } from "./fileinfo"
import { EnvironmentConfig } from ".."
import { EventEmitter } from 'events'
import { GenerateFileKey, Aes256ctrDecrypter } from "../lib/crypto"
import { Shard } from "./shard"
import { eachLimit, eachSeries } from "async"
import DecryptStream from "../lib/decryptstream"
import StreamToBlob from 'stream-to-blob'
import { randomBytes } from 'crypto'

export class FileObject extends EventEmitter {
  shards = new Map<number, ShardObject>()
  rawShards = new Map<number, Shard>()
  fileInfo: FileInfo | undefined
  config: EnvironmentConfig

  bucketId: string
  fileId: string

  fileKey: Buffer

  totalSizeWithECs = 0

  decipher: DecryptStream

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string) {
    super()
    this.config = config
    this.bucketId = bucketId
    this.fileId = fileId
    this.fileKey = Buffer.alloc(0)
    this.decipher = new DecryptStream(randomBytes(32), randomBytes(16))
  }

  async GetFileInfo(): Promise<FileInfo | undefined> {
    if (!this.fileInfo) {
      this.fileInfo = await GetFileInfo(this.config, this.bucketId, this.fileId)
      if (this.config.encryptionKey)
        this.fileKey = await GenerateFileKey(this.config.encryptionKey, this.bucketId, Buffer.from(this.fileInfo.index, 'hex'))
    }
    return this.fileInfo
  }

  async GetFileMirrors(): Promise<void> {
    this.rawShards = await GetFileMirrors(this.config, this.bucketId, this.fileId)
  }

  StartDownloadFile(): DecryptStream {
    let shardObject

    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo')
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))

    eachLimit(this.rawShards.keys(), 1, (shardIndex, nextItem) => {
      const shard = this.rawShards.get(shardIndex)
      if (this.fileInfo && shard) {
        shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
        this.shards.set(shardIndex, shardObject)

        shardObject.on('progress', () => { this.updateGlobalPercentage() })
        shardObject.on('error', (err: Error) => { console.log('SHARD ERROR', err.message) })
        shardObject.on('end', () => {
          console.log('SHARD END', shard.index)
          nextItem()
        })

        // axios --> hasher
        const buffer = shardObject.StartDownloadShard()

        buffer.on('data', (data) => {
          console.log(data)
        })

        buffer.on('end', () => {
          console.log('buffer end')
        })

        /*
        if (!shard.parity) {
          console.log('piped non parity shard')
          const dec = buffer.pipe(this.decipher, { end: true })
          dec.on('end', () => { console.log('DEC END', shard.index) })
          dec.on('data', (data: Buffer) => { console.log('d', data) })
        } else {
          console.log('parity shard ignored', shard.index)
          buffer.on('data', () => { })
        }
        */

      }
    }, () => {
      this.shards.forEach(shard => { this.totalSizeWithECs += shard.shardInfo.size })
      console.log('ALL SHARDS FINISHED')
      this.emit('end')
    })

    return this.decipher
  }

  private updateGlobalPercentage(): void {
    const result = { totalBytesDownloaded: 0, totalSize: this.totalSizeWithECs, totalShards: this.shards.size, shardsCompleted: 0 }
    eachSeries(this.shards.keys(), (shardIndex, nextShard) => {
      const shard = this.shards.get(shardIndex)
      if (!shard) { return nextShard() }
      if (shard.isFinished()) { result.shardsCompleted++ }
      nextShard()
    }, () => {
      if (result.totalBytesDownloaded === result.totalSize) {
        this.emit('download-end')
      }
      const percentage = result.totalBytesDownloaded / (result.totalSize || 1)
      this.emit('progress', result.totalBytesDownloaded, result.totalSize, percentage)
    })
  }
}