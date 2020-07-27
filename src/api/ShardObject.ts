import { Shard, DownloadShardRequest } from "./shard"
import { EnvironmentConfig } from ".."
import { HashStream } from "../lib/hashstream"
import { ExchangeReport } from "./reports"
import { Transform, PassThrough, Readable } from 'stream'
import { EventEmitter } from 'events'
import { ripemd160 } from "../lib/crypto"

export class ShardObject extends EventEmitter {
  shardInfo: Shard
  shardHash: Buffer | null = null
  config: EnvironmentConfig
  fileId: string
  bucketId: string

  retryCount = 3

  hasher: HashStream
  exchangeReport: ExchangeReport

  private _isFinished = false
  private _isErrored = false

  constructor(config: EnvironmentConfig, shardInfo: Shard, bucketId: string, fileId: string) {
    super()
    this.shardInfo = shardInfo
    this.config = config

    this.bucketId = bucketId
    this.fileId = fileId

    this.hasher = new HashStream(shardInfo.size)
    this.exchangeReport = new ExchangeReport(config)
  }

  StartDownloadShard(): Readable {
    const downloader = DownloadShardRequest(this.config, this.shardInfo.farmer.address, this.shardInfo.farmer.port, this.shardInfo.hash, this.shardInfo.token, this.shardInfo.farmer.nodeID)

    /*
    this.hasher.on('end', () => {
      this.shardHash = ripemd160(this.hasher.read())
      console.log('Result: %s, Expected: %s', this.shardHash.toString('hex'), this.shardInfo.hash)
      if (this.shardHash.toString('hex') !== this.shardInfo.hash) {
        console.error('Hash shard corrupt')
        this._isErrored = true
        this.emit('error', new Error('Invalid shard hash'))
      }
    })
    */
    /*

    res.on('end', () => {
      this.hasher.end()
      this._isFinished = true
      if (!this._isErrored) {
        this.emit('end')
      }
    })

    res.on('data', () => {})
    */

    return downloader
  }


  isFinished(): boolean { return this._isFinished }
}