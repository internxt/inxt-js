import { ShardObject } from "./ShardObject"
import { FileInfo, GetFileInfo, GetFileMirrors } from "./fileinfo"
import { EnvironmentConfig } from ".."
import { EventEmitter } from 'events'
import { GenerateFileKey, Aes256ctrDecrypter } from "../lib/crypto"
import { Shard } from "./shard"
import { eachLimit, eachSeries, queue, times, AsyncResultIterator } from "async"
import DecryptStream from "../lib/decryptstream"
import StreamToBlob from 'stream-to-blob'
import { randomBytes } from 'crypto'
import FileMuxer from "../lib/filemuxer"
import MuxDemux from 'mux-demux'

export class FileObject extends EventEmitter {
  shards: ShardObject[] = []
  rawShards: Shard[] = []
  fileInfo: FileInfo | undefined
  config: EnvironmentConfig

  length = -1
  final_length = -1

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

    this.length = this.rawShards.reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
    this.final_length = this.rawShards.filter(x => x.parity === false).reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
  }

  StartDownloadFile(): FileMuxer {
    let shardObject

    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo')
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))

    const fileMuxer = new FileMuxer({
      shards: this.rawShards.length,
      length: this.rawShards.reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
    })

    eachLimit(this.rawShards, 1, (shard, nextItem) => {
      if (this.fileInfo && shard) {
        shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
        this.shards.push(shardObject)

        // axios --> hasher
        const buffer = shardObject.StartDownloadShard()
        fileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)
        fileMuxer.once('drain', () => nextItem())
      }
    }, () => {
      this.shards.forEach(shard => { this.totalSizeWithECs += shard.shardInfo.size })
      console.log('ALL SHARDS FINISHED')
      this.emit('end')
    })

    return fileMuxer
  }

  /*
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
  */
}