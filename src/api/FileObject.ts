import { randomBytes } from 'crypto'
import { Duplex } from 'stream'
import { EventEmitter } from 'events'
import { eachLimit, retry } from 'async'

import DecryptStream from "../lib/decryptstream"
import FileMuxer from "../lib/filemuxer"
import { GenerateFileKey } from "../lib/crypto"

import { ShardObject } from "./ShardObject"
import { FileInfo, GetFileInfo, GetFileMirrors, GetFileMirror } from "./fileinfo"
import { EnvironmentConfig } from ".."
import { Shard } from "./shard"
import { ExchangeReport } from './reports'
import { DECRYPT, DOWNLOAD, FILEMUXER, FILEOBJECT } from '../lib/events'

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

  async StartDownloadShard(index: number): Promise<FileMuxer> {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo')
    }

    const shardIndex = this.rawShards.map(x => x.index).indexOf(index)
    const shard = this.rawShards[shardIndex]

    const fileMuxer = new FileMuxer({ shards: 1, length: shard.size })

    const shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
    const buffer = await shardObject.StartDownloadShard()

    fileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)

    return fileMuxer
  }

  async TryDownloadShardWithFileMuxer(shard: Shard, excluded: string[] = []): Promise<Buffer> {
    const exchangeReport = new ExchangeReport(this.config)

    return new Promise((resolve, reject) => {
      retry({ times: this.config.config?.shardRetry || 3, interval: 1000 }, async (nextTry) => {
        exchangeReport.params.exchangeStart = new Date()
        exchangeReport.params.farmerId = shard.farmer.nodeID
        exchangeReport.params.dataHash = shard.hash

        let downloadHasError = false
        let downloadError: Error | null = null

        const oneFileMuxer = new FileMuxer({ shards: 1, length: shard.size })
        const shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
  
        oneFileMuxer.on(FILEMUXER.PROGRESS, (msg) => this.emit(FILEMUXER.PROGRESS, msg))
        oneFileMuxer.on('error', (err) => {
          downloadHasError = true
          downloadError = err
          this.emit(FILEMUXER.ERROR, err)

          // Should emit Exchange Report?
          exchangeReport.DownloadError()
          exchangeReport.sendReport().catch((err) => { err })

          // Force to finish this attempt
          oneFileMuxer.emit('drain')
        })
  
        const buffs: Buffer[] = []
        oneFileMuxer.on('data', (data: Buffer) => { buffs.push(data) })
  
        oneFileMuxer.once('drain', () => {
          if (downloadHasError) {
            nextTry(downloadError)
          } else {
            exchangeReport.DownloadOk()
            exchangeReport.sendReport().catch((err) => { err })

            nextTry(null, Buffer.concat(buffs))
          }
        })
  
        const buffer = await shardObject.StartDownloadShard()
  
        oneFileMuxer.addInputSource(buffer, shard.size, Buffer.from(shard.hash, 'hex'), null)
      }, async (err, result: Buffer) => {
        try {
          if (!err) {
            return resolve(result) 
          } else {
            excluded.push(shard.farmer.nodeID)

            const newShard = await GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded)
            
            if (!newShard[0].farmer) {
              return reject(Error('File missing shard error'))
            }
            
            const buffer = await this.TryDownloadShardWithFileMuxer(newShard[0], excluded)
            return resolve(buffer)
          }
        } catch (err) {
          return reject(err)
        }   
      })
    })

  }

  StartDownloadFile(): FileMuxer {
    if (!this.fileInfo) {
      throw new Error('Undefined fileInfo')
    }

    this.decipher = new DecryptStream(this.fileKey.slice(0, 32), Buffer.from(this.fileInfo.index, 'hex').slice(0, 16))

    this.decipher.on('error', (err) => this.emit(DECRYPT.ERROR, err))
    this.decipher.on(DECRYPT.PROGRESS, (msg) => this.emit(DECRYPT.PROGRESS, msg))

    const fileMuxer = new FileMuxer({
      shards: this.rawShards.length,
      length: this.rawShards.reduce((a, b) => { return { size: a.size + b.size } }, { size: 0 }).size
    })

    fileMuxer.on('error', (err) => this.emit('download-filemuxer-error', err))
    fileMuxer.on(FILEMUXER.PROGRESS, (msg) => this.emit(FILEMUXER.PROGRESS, msg))

    let shardObject

    eachLimit(this.rawShards, 1, (shard, nextItem) => {
      if (!shard) { 
        return nextItem(Error('Null shard found')) 
      }

      shardObject = new ShardObject(this.config, shard, this.bucketId, this.fileId)
      this.shards.push(shardObject)

      // We add the stream buffer to the muxer, and will be downloaded to the main stream.
      // We should download the shard isolated, and check if its ok.
      // If it fails, try another mirror.
      // If its ok, add it to the muxer.
      this.TryDownloadShardWithFileMuxer(shard).then((shardBuffer: Buffer) => {
        fileMuxer.addInputSource(BufferToStream(shardBuffer), shard.size, Buffer.from(shard.hash, 'hex'), null)
          .once('error', (err) => { throw err })  
          .once('drain', () => {
            // continue just if drain fired, 'drain' = decrypted correctly and ready for more
            this.emit(DOWNLOAD.PROGRESS, shardBuffer.length)
            nextItem()
          })

      }).catch((err) => {
        nextItem(err)
      })

    }, (err: Error | null | undefined) => {
      // if (err) {        
      //   // this.emit(FILEOBJECT.ERROR, err)

      // }

      this.shards.forEach(shard => { this.totalSizeWithECs += shard.shardInfo.size })
      this.emit('end', err)
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