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
import { logger } from "../lib/utils/logger"

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

  constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string)  {
    this.config = config
    this.index = Buffer.alloc(0)
    this.fileMeta = fileMeta
    this.bucketId = bucketId
    this.frameId = ''
    this.funnel = new FunnelStream(computeShardSize(fileMeta.size))
    this.cipher = new EncryptStream(randomBytes(32), randomBytes(16))
    this.fileEncryptionKey = randomBytes(32)
  }

  async init(): Promise<void> {
    this.index = randomBytes(32)
    this.fileEncryptionKey = await GenerateFileKey(this.config.encryptionKey || '', this.bucketId, this.index)

    this.cipher = new EncryptStream(this.fileEncryptionKey, this.index.slice(0, 16))
  }

  async CheckBucketExistance(): Promise<boolean> {
    logger.info(`checking if bucket ${this.bucketId} exists`)

    try {
        // if bucket not exists, bridge returns an error
        await api.getBucketById(this.config, this.bucketId)

        logger.info(`bucket ${this.bucketId} exists`)

        return false
    } catch (err) {
        err = { ...err, message: `CheckBucketExistanceError: Due to ${err.message || '??'}` }

        if (err.message === ERRORS.BUCKET_NOT_FOUND) {
            logger.error(`Bucket ${this.bucketId} not found`)
            return true
        } else {
            return Promise.reject(err)
        }
    }
  }

  async StageFile(): Promise<api.FrameStaging | void> {
    let response

    try {
        if (response = await api.createFrame(this.config)) {
            this.frameId = response.id

            logger.debug(`staged a file with frame ${this.frameId}`)
        } else {
            throw new Error('Staging file response was empty')
        }
    } catch (err) {
        err = { ...err, message: `StageFileError: Due to ${err.message || '??'}` }
        return Promise.reject(err)
    }
  }

  async SaveFileInNetwork(bucketEntry: api.CreateEntryFromFrameBody): Promise<void | api.CreateEntryFromFrameResponse> {
    try {
        const response = await api.createEntryFromFrame(this.config, this.bucketId, bucketEntry)

        if (response) {
            logger.info(`saved file in network with id ${response.id} inside bucket ${this.bucketId}`)
        } else {
            throw new Error('Save file in network response was empty')
        }

        return response
    } catch (err) {
        err = { ...err, message: `SaveFileInNetworkError: Due to ${err.message || '??'}` }
        return Promise.reject(err)
    }
  }

  async NegotiateContract(frameId: string, shardMeta: ShardMeta): Promise<void | ContractNegotiated> {
    try {
        const response = await api.addShardToFrame(this.config, frameId, shardMeta)

        if (response) {
            logger.debug(`negotiated a contract for shard ${shardMeta.hash}(index ${shardMeta.index}, size ${shardMeta.size}) with token ${response.token}`)
        } else {
            throw new Error('Negotiate contract response was empty')
        }

        return response
    } catch (err) {
        err = { ...err, message: `NegotiateContractError: Due to ${err.message || '??'}` }
        return Promise.reject(err)
    }
  }

  async NodeRejectedShard(encryptedShard: Buffer, shard: Shard): Promise<boolean> {
    try {
        await api.sendShardToNode(this.config, shard, encryptedShard)

        logger.debug(`node ${shard.farmer.nodeID} accepted shard ${shard.hash}`)

        return false
    } catch (err) {
        return Promise.reject(err)
    }
  }

  GenerateHmac(shardMetas: ShardMeta[]): string {
    const hmac = sha512HmacBuffer(this.fileEncryptionKey)

    if (shardMetas && shardMetas.length > 0) {
        for (let i = 0; i < shardMetas.length; i++) {
            hmac.update(Buffer.from(shardMetas[i].hash, 'hex'))
        }
    }

    return hmac.digest().toString('hex')
  }

  async StartUploadFile(): Promise<EncryptStream> {
    logger.info('Starting file upload')

    await this.CheckBucketExistance()
    await this.StageFile()

    return this.fileMeta.content.pipe(this.funnel).pipe(this.cipher)
  }

  async UploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number): Promise<ShardMeta> {
    const shardMeta: ShardMeta = getShardMeta(encryptedShard, shardSize, index, false)
    logger.info(`uploading shard ${shardMeta.hash}`)

    let negotiatedContract: ContractNegotiated | void
    let token = "", operation = ""
    let farmer = { userAgent: "", protocol: "", address: "", port: 0, nodeID: "", lastSeen: new Date() }

    try {
        if (negotiatedContract = await this.NegotiateContract(frameId, shardMeta)) {
            token = negotiatedContract.token
            operation = negotiatedContract.operation
            farmer = { ...negotiatedContract.farmer, lastSeen: new Date() }
        }

        const hash = shardMeta.hash
        const shard: Shard = { index, replaceCount: 0, hash, size: shardSize, parity: false, token, farmer, operation }

        const exchangeReport = new ExchangeReport(this.config)
        exchangeReport.params.dataHash = hash
        exchangeReport.params.farmerId = shard.farmer.nodeID

        if (await this.NodeRejectedShard(encryptedShard, shard)) {
            exchangeReport.DownloadError()
        } else {
            exchangeReport.DownloadOk()
        }

        exchangeReport.params.exchangeEnd = new Date()
        await exchangeReport.sendReport()

    } catch (err) {
        if (attemps > 1) {
            logger.error(`upload ${shardMeta.hash} failed. Retrying...`)
            await this.UploadShard(encryptedShard, shardSize, frameId, index, --attemps)
        } else {
            err = { ...err, message: `UploadShardError: Shard ${shardMeta.hash} not uploaded due to ${err.message || '??'}` }
            return Promise.reject(err)
        }
    }

    logger.info(`shard ${shardMeta.hash} uploaded successfully`)
    return shardMeta
  }

}
