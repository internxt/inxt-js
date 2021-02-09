import { MerkleTree, merkleTree } from './merkleTree'
import { sha256 } from './crypto'

// req object for put a frame
export interface ShardMeta {
  hash: string,
  size: number, //size of the actual file
  index: number,
  is_parity: boolean,
  challenges?: Buffer[],
  challenges_as_str: string[]
  tree: string[]
  exclude?: any
}

function getShardHash(encryptedShardData: Buffer) : Buffer {
  const shardHash: Buffer = sha256(encryptedShardData)
  return shardHash
}

function setShardMeta(encryptedShardData: Buffer, fileSize: number, index: number, is_parity: boolean, exclude: any): ShardMeta {
  const mT: MerkleTree = merkleTree(encryptedShardData)
  const shardMeta: ShardMeta = {
    hash: getShardHash(encryptedShardData).toString("hex"),
    size: fileSize,
    index: index,
    is_parity: is_parity,
    challenges_as_str: mT.challenges_as_str,
    tree: mT.leaf
  }
  return shardMeta
}

function getShardMerkleTree(encryptedShardData: Buffer): MerkleTree {
  const mT: MerkleTree = merkleTree(encryptedShardData)
  return mT
}

module.exports = { setShardMeta }


