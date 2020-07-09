import { ripemd160, sha256HashBuffer } from "../lib/crypto"
import fetch from 'node-fetch'

export interface Shard {
  farmer: {
    address: string
    port: number
  },
  hash: string,
  token: string
  index: string
}

async function DownloadShardRequest(address: string, port: number, hash: string, token: string, excluded: Array<string> = []) {
  const excludedNodeIds = excluded.join(',')

  return fetch(`http://${address}:${port}/shards/${hash}?token=${token}&exclude=${excluded}`).then((res: any) => {
    if (res.status === 200) {
      return res.buffer()
    } else {
      throw res
    }
  }).catch(err => {
    console.log('ERROR', err.message)
  })

}

export async function DownloadShard(shard: Shard) {
  const hasher = sha256HashBuffer()
  const shardBinary = await DownloadShardRequest(shard.farmer.address, shard.farmer.port, shard.hash, shard.token)
  hasher.update(shardBinary)
  const rmdDigest = hasher.digest()
  const finalShardHashBin = ripemd160(rmdDigest)
  const finalShardHash = Buffer.from(finalShardHashBin).toString('hex')
  console.log('SHARD %s: Is hash ok = %s', shard.index, finalShardHash === shard.hash)
  console.log('SHARD %s length: %s', shard.index, shardBinary.length)
  // TODO create exange report
  return shardBinary
}