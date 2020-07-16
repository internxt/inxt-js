import { ShardObject } from "./ShardObject"
import { FileInfo, GetFileInfo, GetFileMirrors } from "./fileinfo"
import { EnvironmentConfig } from ".."
import { EventEmitter } from 'events'
import { GenerateFileKey, Aes256ctrDecrypter } from "../lib/crypto"
import { Shard } from "./shard"
import { eachLimit, eachSeries } from "async"
import DecryptStream from "../lib/decryptstream"
import fs from 'fs'
export class FileObject extends EventEmitter {
  shards = new Map<number, ShardObject>()
  rawShards = new Map<number, Shard>()
  fileInfo: FileInfo | undefined
  config: EnvironmentConfig

  bucketId: string
  fileId: string

  fileKey: Buffer

  totalSizeWithECs = 0

  decipher: DecryptStream | null = null

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string) {
    super()
    this.config = config
    this.bucketId = bucketId
    this.fileId = fileId
    this.fileKey = Buffer.alloc(0)
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

  async StartDownloadFile(): Promise<void> {
    if (this.fileInfo === null) { return }
    let shardObject
    return eachLimit(this.rawShards.keys(), 1, (shardIndex, nextItem) => {
      const shard = this.rawShards.get(shardIndex)

      if (this.fileInfo && shard) {
        shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
        this.shards.set(shardIndex, shardObject)
        shardObject.on('progress', () => { this.updateGlobalPercentage() })
        shardObject.on('error', (err: Error) => { console.log('SHARD ERROR', err.message) })
        shardObject.StartDownloadShard()
      }

      return nextItem()
    }, () => {
      this.shards.forEach(shard => { this.totalSizeWithECs += shard.shardInfo.size })
    })
  }

  private updateGlobalPercentage(): void {
    const result = { totalBytesDownloaded: 0, totalSize: this.totalSizeWithECs, totalShards: this.shards.size, shardsCompleted: 0 }
    eachSeries(this.shards.keys(), (shardIndex, nextShard) => {
      const shard = this.shards.get(shardIndex)
      if (!shard) { return nextShard() }
      result.totalBytesDownloaded += shard.currentPosition
      if (shard.isFinished()) { result.shardsCompleted++ }
      nextShard()
    }, () => {
      if (result.totalBytesDownloaded === result.totalSize) {
        this.emit('download-end')
        this.emit('decrypt')
        this.DecryptFile()
      }
      const percentage = result.totalBytesDownloaded / (result.totalSize || 1)
      this.emit('progress', result.totalBytesDownloaded, result.totalSize, percentage)
    })
  }

  private DecryptFile() {
    // Prepare decipher
    if (this.fileInfo) {
      this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))
      eachSeries(this.shards.keys(), (shardIndex, nextShard) => {
        const shard = this.shards.get(shardIndex)
        if (!shard?.shardInfo.parity) {
          this.decipher?.push(shardIndex, shard?.shardData)
        }
        nextShard()
      }, () => {
        return this.decipher?.final()
      })
    }
  }
}