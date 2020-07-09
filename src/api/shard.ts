import { ripemd160, sha256HashBuffer } from "../lib/crypto"

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

  return global.fetch(`https://api.internxt.com:8081/http://${address}:${port}/shards/${hash}?token=${token}&exclude=${excluded}`).then((res) => {
    if (res.status === 200) {
      return res.arrayBuffer()
    } else {
      throw res
    }
  }).catch(err => {
    console.log('ERROR', err.message)
    return null
  })

}

export async function CheckShard(shard: Shard) {

}

export async function DownloadShard(shard: Shard) {
  console.log(shard)
  const hasher = sha256HashBuffer()
  const shardBinary = await DownloadShardRequest(shard.farmer.address, shard.farmer.port, shard.hash, shard.token)
  if (shardBinary !== null)
    hasher.update(Buffer.from(shardBinary))
  const rmdDigest = hasher.digest()
  const finalShardHashBin = ripemd160(rmdDigest)
  const finalShardHash = Buffer.from(finalShardHashBin).toString('hex')
  console.log('SHARD %s: Is hash ok = %s', shard.index, finalShardHash === shard.hash)
  // console.log('SHARD %s length: %s', shard.index, shardBinary.length)
  // TODO create exange report
  return Buffer.from(shardBinary ? shardBinary : '')
}