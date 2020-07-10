import { ripemd160, sha256HashBuffer } from "../lib/crypto"
import { request } from "../services/request"
import { EnvironmentConfig } from ".."
import { GetFileMirror } from "./fileinfo"

export interface Shard {
  farmer: {
    address: string
    port: number
    nodeID: string
  },
  hash: string,
  token: string
  index: number
}

async function DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string) {
  let fetchUrl = `http://${address}:${port}/shards/${hash}?token=${token}`
  return request(config, 'GET', `https://api.internxt.com:8081/${fetchUrl}`, { responseType: 'arraybuffer' }, () => { })
}

export async function CheckShard(shard: Shard) {

}

export async function DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes: Array<string> = []): Promise<Buffer | never> {

  const hasher = sha256HashBuffer()
  const shardBinary = await DownloadShardRequest(config, shard.farmer.address, shard.farmer.port, shard.hash, shard.token)
  hasher.update(Buffer.from(shardBinary.data))
  const rmdDigest = hasher.digest()
  const finalShardHashBin = ripemd160(rmdDigest)
  const finalShardHash = Buffer.from(finalShardHashBin).toString('hex')

  if (finalShardHash === shard.hash) {
    return shardBinary.data
  } else {
    excludedNodes.push(shard.farmer.nodeID)
    const anotherMirror: Array<Shard> = await GetFileMirror(config, bucketId, fileId, 1, shard.index, excludedNodes)
    if (!anotherMirror[0].farmer) {
      throw Error('File missing shard error')
    } else {
      return DownloadShard(config, anotherMirror[0], bucketId, fileId, excludedNodes)
    }
  }
}