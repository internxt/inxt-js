import { EnvironmentConfig } from ".."
import { Readable } from 'stream'
import { randomBytes } from 'crypto'

import * as api from '../services/request'

import EncryptStream from "../lib/encryptStream"
import { GenerateFileKey, sha512HmacBuffer } from "../lib/crypto"
import { FunnelStream } from "../lib/funnelStream"
import { computeShardSize } from "../lib/utils/shard"
import { getShardMeta, ShardMeta } from '../lib/shardMeta'
import { ContractNegotiated } from '../lib/contracts'
import { ERRORS } from "../lib/errors"

import { ExchangeReport } from "./reports"
import { Shard } from "./shard"

export interface FileMeta {
    size: number,
    name: string,
    content: Readable
}

export class FileObjectUpload {
  private config: EnvironmentConfig
  private fileMeta: FileMeta

  bucketId: string
  frameId: string
  index: Buffer

  cipher: EncryptStream
  funnel: FunnelStream
  fileEncryptionKey: Buffer

  constructor (config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string)  {
    this.config = config
    this.index = Buffer.alloc(0)
    this.fileMeta = fileMeta
    this.bucketId = bucketId
    this.frameId = ''
    this.funnel = new FunnelStream(computeShardSize(fileMeta.size))
    this.cipher = new EncryptStream(randomBytes(32), randomBytes(16))
    this.fileEncryptionKey = randomBytes(32)
  }

  async init() : Promise<void> {
    this.index = randomBytes(32)
    this.fileEncryptionKey = await GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index)

    this.cipher = new EncryptStream(this.fileEncryptionKey, this.index.slice(0, 16)) 
  }

  async CheckBucketExistance() : Promise<boolean> {
    try {
        // if bucket not exists, bridge returns an error
        await api.getBucketById(this.config, this.bucketId)
        return false
    } catch (err) {
        if (err.message === ERRORS.BUCKET_NOT_FOUND) {
            return true
        } else {
            return Promise.reject(err)
        } 
    }
  }

  async StageFile() : Promise<api.FrameStaging | void> {
    let response

    try {
        if(response = await api.createFrame(this.config)) {
            this.frameId = response.id
        } else {
            throw new Error('Staging file response was empty')
        }
    } catch (err) {
        return Promise.reject(err)
    }
  }

  async SaveFileInNetwork(bucketEntry: api.CreateEntryFromFrameBody) : Promise<void | api.CreateEntryFromFrameResponse> {
    try {
        return await api.createEntryFromFrame(this.config, this.bucketId, bucketEntry)
    } catch (err) {
        return Promise.reject(err)
    }
  }

  async NegotiateContract(frameId: string, shardMeta: ShardMeta) : Promise<void | ContractNegotiated> {
    try {
        return await api.addShardToFrame(this.config, frameId, shardMeta)
    } catch (err) {
        return Promise.reject(err)
    }
  }

  async NodeRejectedShard(encryptedShard: Buffer, shard: Shard) : Promise<boolean> {
    try {
        await api.sendShardToNode(this.config, shard, encryptedShard)
        return false
    } catch (err) {
        return Promise.reject(err)
    }
  }

  Abort(reason: string) : void {
    throw new Error(`Aborted upload due to ${reason}`)
  }

  GenerateHmac(shardMetas: ShardMeta[]) : string {
    const hmac = sha512HmacBuffer(this.fileEncryptionKey)

    if (shardMetas && shardMetas.length > 0) {
        for(let i = 0; i < shardMetas.length; i++) {
            hmac.update(Buffer.from(shardMetas[i].hash, 'hex'))
        }
    }

    return hmac.digest().toString('hex')
  }

  async StartUploadFile() : Promise<EncryptStream> {
    await this.CheckBucketExistance()
    await this.StageFile()

    return this.fileMeta.content.pipe(this.funnel).pipe(this.cipher)
  }

  async UploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number) : Promise<ShardMeta> {
    const shardMeta : ShardMeta = getShardMeta(encryptedShard, shardSize, index, false)

    let negotiatedContract: ContractNegotiated | void
    let token = "", operation = ""
    let farmer = { userAgent: "", protocol: "", address: "", port: 0, nodeID: "", lastSeen: new Date() }

    try {
        if(negotiatedContract = await this.NegotiateContract(frameId, shardMeta)) {
            token = negotiatedContract.token
            operation = negotiatedContract.operation
            farmer = { ...negotiatedContract.farmer, lastSeen: new Date() }
        } else {
            this.Abort('Negotiated contract response is empty')
        }

        console.log('dos')

        const hash = shardMeta.hash
        const shard: Shard = { index, replaceCount: 0, hash, size: shardSize, parity: false, token, farmer, operation }
        
        const exchangeReport = new ExchangeReport(this.config)
        exchangeReport.params.dataHash = hash
        exchangeReport.params.farmerId = shard.farmer.nodeID

        if(await this.NodeRejectedShard(encryptedShard, shard)) {
            exchangeReport.DownloadError()
        } else {
            exchangeReport.DownloadOk()
        }

        console.log('tres')

        exchangeReport.params.exchangeEnd = new Date()
        await exchangeReport.sendReport()

        console.log('cuatro')

    } catch (err) {
        console.log(err)
        if(attemps > 1) {
            await this.UploadShard(encryptedShard, shardSize, frameId, index, --attemps)
        } else {
            this.Abort(err.message)
        }
    }

    return shardMeta
  }

}