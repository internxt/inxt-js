import { Shard, DownloadShard, DownloadShardRequest } from "./shard"
import { Hash } from 'crypto'
import { EnvironmentConfig } from ".."
import { Hmac } from 'crypto'
import { HashStream } from "../lib/hashstream"
import { ExchangeReport } from "./reports"
import { Transform } from 'stream'
import DecryptStream from "../lib/decryptstream"
import { EventEmitter } from 'events'
import { ripemd160 } from "../lib/crypto"

export class ShardObject extends EventEmitter {
  shardData: Buffer
  shardInfo: Shard
  shardHash: Buffer | null = null
  currentPosition: number
  config: EnvironmentConfig
  fileId: string
  bucketId: string

  retryCount = 3

  hasher: HashStream
  exchangeReport: ExchangeReport

  downloadStream: Transform

  private _isFinished = false

  constructor(config: EnvironmentConfig, shardInfo: Shard, bucketId: string, fileId: string) {
    super()
    this.shardInfo = shardInfo
    this.shardData = Buffer.alloc(0)
    this.config = config

    this.bucketId = bucketId
    this.fileId = fileId

    this.currentPosition = 0

    this.hasher = new HashStream(shardInfo.size)
    this.exchangeReport = new ExchangeReport(config)

    this.downloadStream = new Transform({ transform(chunk, enc, cb) { cb(null, chunk) } })
  }

  StartDownloadShard(): void {
    const downloader = DownloadShardRequest(this.config, this.shardInfo.farmer.address, this.shardInfo.farmer.port, this.shardInfo.hash, this.shardInfo.token)
    const res = downloader.pipe(this.hasher).pipe(this.downloadStream)

    this.shardData = Buffer.alloc(this.shardInfo.size)

    this.currentPosition = 0

    this.hasher.on('end', () => {
      this.shardHash = ripemd160(this.hasher.read())
      if (this.shardHash.toString('hex') !== this.shardInfo.hash) {
        this.emit('error', new Error('Invalid shard hash'))
      }
    })

    res.on('data', (data: Buffer) => {
      data.copy(this.shardData, this.currentPosition)
      this.currentPosition += data.length
      this.emit('progress', this.currentPosition, this.shardInfo.size, this.currentPosition / this.shardInfo.size)
    })

    res.on('end', () => {
      this._isFinished = true
      this.emit('end')
    })
  }


  isFinished(): boolean { return this._isFinished }
}