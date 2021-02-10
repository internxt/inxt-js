import { ripemd160, sha256HashBuffer } from "../lib/crypto"
import { request, streamRequest } from "../services/request"
import { EnvironmentConfig } from ".."
import { GetFileMirror, FileInfo } from "./fileinfo"
import { ExchangeReport } from "./reports"
import { HashStream } from '../lib/hashstream'
import { Transform, Readable } from 'stream'
import { ShardMeta,  getShardMeta } from '../lib/shardMeta'
import { createFrame, AddShardToFrame } from '../services/request'
import Environment from "../lib/browser"

export interface Shard {
  index: number
  replaceCount: number
  hash: string
  size: number
  parity: boolean
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

export function DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string, nodeID: string): Readable {
  const fetchUrl = `http://${address}:${port}/shards/${hash}?token=${token}`
  return streamRequest(`https://api.internxt.com:8081/${fetchUrl}`, nodeID)
}

export async function DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes: Array<string> = []): Promise<Transform | never> {

  const hasher = new HashStream(shard.size)
  const exchangeReport = new ExchangeReport(config)
  const shardBinary = await DownloadShardRequest(config, shard.farmer.address, shard.farmer.port, shard.hash, shard.token, shard.farmer.nodeID)

  const outputStream = shardBinary.pipe<HashStream>(hasher)

  const finalShardHash: string = await new Promise((resolve) => {
    hasher.on('end', () => { resolve(ripemd160(hasher.read()).toString('hex')) })
  })

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
      return DownloadShard(config, anotherMirror[0], bucketId, fileId, excludedNodes)
    }
  }
}

/* Upload File here */
export async function uploadFile(fileData, filename) {
  // https://nodejs.org/api/stream.html#stream_readable_readablelength
  /*
  1. Check if bucket-id exists // Per file
  2. Check if file exists // Per file
  3. read source
  4. encryption
  5. sharding process (just tokenize the original data)
  6. call upload shard -> pause the sharding process
  7. When the upload resolves [Promise] resume stream
  8. See 4.7 in UploadShard
    */
}



export async function UploadShard(config: EnvironmentConfig, encryptedShardData: Buffer, bucketId: string, fileId: string, excludedNodes: Array<string> = []): Promise<Transform | never> {

    // 1. Sharding process -> It is delegated to uploadFile
    // 2. Encrypt shard -> It is delegated to uploadFile
    //4. Begin req to bridge logic
    // 4.1 Get frame-id (Staging)
    const frameStaging = await createFrame(EnvironmentConfig, jwt)
    const frameId = frameStaging.id
    // 3. Set shardMeta
    const shardMeta: ShardMeta = getShardMeta(encryptedShardData, fileSize, index, parity, exclude)
    //  4.2 Retrieve pointers to node
    const negotiatedContract = addShardToFrame(EnvironmentConfig, frameId, shardMeta, jwt)
    //  4.3 Store shard in node (Post data to a node)
    //  4.4 Send exchange report
    //  4.5 Save file in inxt network (End of upload)
    // 5. Success
}