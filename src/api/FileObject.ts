import { ShardObject } from "./ShardObject"
import { FileInfo, GetFileInfo, GetFileMirrors, GetFileMirror } from "./fileinfo"
import { DownloadProgressCallback, EnvironmentConfig } from ".."
import { EventEmitter } from 'events'
import { GenerateFileKey, Aes256ctrDecrypter } from "../lib/crypto"
import { Shard } from "./shard"
import { eachLimit, eachSeries, queue, times, AsyncResultIterator, retry } from "async"
import DecryptStream from "../lib/decryptstream"
import StreamToBlob from 'stream-to-blob'
import { randomBytes } from 'crypto'
import FileMuxer from "../lib/filemuxer"
import * as fs from 'fs'
import { Duplex } from 'stream'

function BufferToStream(buffer: Buffer): Duplex {
  const stream = new Duplex()
  stream.push(buffer)
  stream.push(null)
  return stream
}

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

    // Sanitize address
    this.rawShards.map(shard => {
      shard.farmer.address = shard.farmer.address.trim()
    })

    this.length = this.rawShards.reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
    this.final_length = this.rawShards.filter(x => x.parity === false).reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
  }

  StartDownloadShard(index: number): FileMuxer {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo')
    }

    const shardIndex = this.rawShards.map(x => x.index).indexOf(index)
    const shard = this.rawShards[shardIndex]

    const fileMuxer = new FileMuxer({ shards: 1, length: shard.size })

    const shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
    const buffer = shardObject.StartDownloadShard()

    fileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)

    return fileMuxer
  }

  async TryDownloadShardWithFileMuxer(shard: Shard, excluded: string[] = []): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      retry({ times: this.config.config?.shardRetry || 3, interval: 1000 }, (nextTry) => {
        let downloadHasError = false
        let downloadError: Error | null = null
        const oneFileMuxer = new FileMuxer({ shards: 1, length: shard.size })
        const shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
  
        oneFileMuxer.on('error', (err) => {
          downloadHasError = true
          downloadError = err
          // Should emit Exchange Report?
        })
  
        const buffs: Buffer[] = []
        oneFileMuxer.on('data', (data: Buffer) => { buffs.push(data) })
  
        oneFileMuxer.once('drain', () => {
          if (downloadHasError) {
            nextTry(downloadError)
          } else {
            nextTry(null, Buffer.concat(buffs))
          }
        })
  
        const buffer = shardObject.StartDownloadShard()
  
        oneFileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)
      }, async (err, result: Buffer) => {
        if (err) {
          excluded.push(shard.farmer.nodeID)
          const newShard = await GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded)
          if (!newShard[0].farmer) {
            reject(Error('File missing shard error'))
          } else {
            return this.TryDownloadShardWithFileMuxer(newShard[0], excluded)
          }
        } else {
          resolve(result)
        }
      })
    })

  }

  StartDownloadFile(cb: DownloadProgressCallback): FileMuxer {
    let shardObject
    let downloadedBytes = 0
    let progress = 0
    const totalBytes = this.fileInfo ? this.fileInfo.size : 0

    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo')
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))

    const fileMuxer = new FileMuxer({
      shards: this.rawShards.length,
      length: this.rawShards.reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
    })

    eachLimit(this.rawShards, 1, async (shard, nextItem) => {
      if (this.fileInfo && shard) {


        shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
        this.shards.push(shardObject)

        // axios --> hasher
        // const buffer = shardObject.StartDownloadShard()

        // We add the stream buffer to the muxer, and will be downloaded to the main stream.
        // We should download the shard isolated, and check if its ok.
        // If it fails, try another mirror.
        // If its ok, add it to the muxer.
        const shardBuffer = await this.TryDownloadShardWithFileMuxer(shard)
        fileMuxer.addInputSource(BufferToStream(shardBuffer), shard.size, Buffer.from(shard.hash, 'hex'), null)

        downloadedBytes += shardBuffer.length
        progress = (downloadedBytes / totalBytes) * 100
        cb(progress, downloadedBytes, totalBytes)

        // fileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)
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
    const result = { totalBytesDownloaded: 0, totalSize: this.totalSizeWithECs, totalShards: this.shards.length, shardsCompleted: 0 }
    eachSeries(this.shards.keys(), (shardIndex, nextShard) => {
      const shard = this.shards[shardIndex]
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