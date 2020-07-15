import { ripemd160, sha256HashBuffer } from "../lib/crypto"
import { request, streamRequest } from "../services/request"
import { EnvironmentConfig } from ".."
import { GetFileMirror, FileInfo } from "./fileinfo"
import { ExchangeReport } from "./reports"
import { HashStream } from '../lib/hashstream'
import { Transform } from 'stream'

export interface Shard {
  index: number
  hash: string
  size: number
  parity: Boolean
  token: string
  farmer: {
    userAgent: string
    protocol: string
    address: string
    port: number
    nodeID: string
    lastSeen: Date
  }
  operation: string
}

function DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string, size: number) {
  let fetchUrl = `http://${address}:${port}/shards/${hash}?token=${token}`
  return streamRequest(config, 'GET', `https://api.internxt.com:8081/${fetchUrl}`, { responseType: 'stream' }, size, () => { })
}

export async function DownloadShard(config: EnvironmentConfig, fileInfo: FileInfo, shard: Shard, bucketId: string, fileId: string, excludedNodes: Array<string> = []): Promise<Transform | never> {

  const hasher = new HashStream(shard.size)
  const exchangeReport = new ExchangeReport(config)
  const shardBinary = await DownloadShardRequest(config, shard.farmer.address, shard.farmer.port, shard.hash, shard.token, shard.size)

  const outputStream = shardBinary.pipe<HashStream>(hasher)

  // Force data to be piped
  outputStream.on('data', () => { })


  const finalShardHash: string = await new Promise((resolve) => {
    hasher.on('end', () => { resolve(ripemd160(hasher.read()).toString('hex')) })
  })

  outputStream.hashito = finalShardHash

  exchangeReport.params.dataHash = finalShardHash
  exchangeReport.params.exchangeEnd = new Date()
  exchangeReport.params.farmerId = shard.farmer.nodeID

  if (finalShardHash === shard.hash) {
    console.log('Hash %s is OK', finalShardHash)
    exchangeReport.DownloadOk()
    // exchangeReport.sendReport()
    return outputStream
  } else {
    console.error('Hash %s is WRONG', finalShardHash)
    exchangeReport.DownloadError()
    // exchangeReport.sendReport()
    excludedNodes.push(shard.farmer.nodeID)
    const anotherMirror: Array<Shard> = await GetFileMirror(config, bucketId, fileId, 1, shard.index, excludedNodes)
    if (!anotherMirror[0].farmer) {
      throw Error('File missing shard error')
    } else {
      return DownloadShard(config, fileInfo, anotherMirror[0], bucketId, fileId, excludedNodes)
    }
  }
}