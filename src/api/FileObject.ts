import { ShardObject } from "./ShardObject"
import { FileInfo, GetFileInfo, GetFileMirrors } from "./fileinfo"
import { EnvironmentConfig } from ".."
import { EventEmitter } from 'events'
import { GenerateFileKey } from "../lib/crypto"
import { Shard } from "./shard"
import { eachLimit, eachSeries } from "async"

export class FileObject extends EventEmitter {
  shards = new Map<number, ShardObject>()
  rawShards = new Map<number, Shard>()
  fileInfo: FileInfo | undefined
  config: EnvironmentConfig

  bucketId: string
  fileId: string

  fileKey: Buffer

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
    return eachLimit(this.rawShards.keys(), 4, (shardIndex, nextItem) => {
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
      console.log('ALL SHARDS DOWNLOADING')
    })
  }

  updateGlobalPercentage(): void {
    const result = { totalBytesDownloaded: 0, totalSize: this.fileInfo?.size }
    eachSeries(this.shards.values(), (shard, nextShard) => {
      if (!shard.shardInfo.parity) { result.totalBytesDownloaded += shard.currentPosition }
      nextShard()
    }, () => {
      this.emit('progress', result.totalBytesDownloaded, result.totalSize, result.totalBytesDownloaded / (result.totalSize || 1))
    })
  }
}