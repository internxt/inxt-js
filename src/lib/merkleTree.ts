import { ripemd160, sha256 } from './crypto'
import { randomBytes } from 'crypto'

interface MerkleTree {
  leaf: Buffer[],
  challenge: Buffer[],
  preleaf: Buffer[]
}



const SHARD_CHALLENGES = 4;

export function preleaf(challenge: Buffer, encrypted: Buffer): Buffer {
  const preleafContent = Buffer.concat([challenge, encrypted])
  return ripemd160(sha256(preleafContent))
}

function preleafArray(encrypted: Buffer, challenge: Buffer[]): Buffer[] {
  const preleafArray = challenge.map((challenge) => {
    return Buffer.concat([challenge, encrypted])
  })
  return preleafArray
}

function leaf(preleaf: Buffer): Buffer {
  return ripemd160(sha256(preleaf))
}

function leafArray(preleafArray: Buffer[]): Buffer[] {
  return preleafArray.map( preleaf => {
    return leaf(preleaf)
  })
}
/*
function getChallenges(): Buffer[] {
  let challenges: Buffer[] = new Array(SHARD_CHALLENGES);
  for (let i = 0; i < SHARD_CHALLENGES; i++) {
    challenges.push(randomBytes(16))
  }
  return challenges
}
*/

function challenge(): Buffer {
  return randomBytes(16)
}

function challengeArray(): Buffer[] {
  let challengeArray = new Array(SHARD_CHALLENGES)
  for(let i=0; i<SHARD_CHALLENGES; i++) {
    challengeArray.push(challenge())
  }
  return challengeArray
}

function merkleTree(encrypted: Buffer): MerkleTree {
  // set the challenges randomnly
  const challenges = challengeArray()

  const preleaves = preleafArray(encrypted, challenges)
  const leaves = leafArray(preleaves)

  const merkleTree: MerkleTree = {
    leaf: leaves,
    challenge: challenges,
    preleaf: preleaves
  }

  return merkleTree
}


function getChallenges(mT: MerkleTree): string[] {
  const challenges = mT.challenge.map(challengeBuffer => {
    return challengeBuffer.toString("hex")
  })
  return challenges
}

function getTree(mT: MerkleTree): string[] {
  const tree = mT.leaf.map(leafBuffer => {
    return leafBuffer.toString()
  })
  return tree
}

export { merkleTree, getChallenges, getTree, MerkleTree }






