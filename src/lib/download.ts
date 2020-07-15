import { EnvironmentConfig } from '../index'
import { GetFileInfo, GetFileMirrors } from '../api/fileinfo'
import { GenerateFileKey, Aes256ctrDecrypter } from './crypto'
import { eachSeries, eachLimit } from 'async'
import { DownloadShard, Shard } from '../api/shard'
import { Transform } from 'stream'
import { GlobalHash } from './hashglobalstream'
import crypto from 'crypto'

export default async function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<any> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required')
  }

  // API request file info
  const fileInfo = await GetFileInfo(config, bucketId, fileId)

  // API request file mirrors with tokens
  const fileShards: Shard[] = await GetFileMirrors(config, bucketId, fileId)

  // Prepare file keys to decrypt
  const index = Buffer.from(fileInfo.index, 'hex')
  const fileKey = await GenerateFileKey(config.encryptionKey, bucketId, index)

  const shards: Buffer[] = []
  const binary = await new Promise(resolve => {
    const globalHash = new GlobalHash(fileKey)
    eachLimit(fileShards, 4, async (shard: Shard, nextShard: Function) => {
      console.log('DOWNLOAD SHARD %s', shard.index)
      DownloadShard(config, fileInfo, shard, bucketId, fileId).then((shardData: Transform) => {
        globalHash.push(shard.index, Buffer.from(shardData.hashito, 'hex'))
        shards.push(shardData)
        const time = crypto.randomBytes(3).readInt8() % 15 + 5
        setTimeout(() => {
          nextShard()
        }, time)
      }).catch((err) => {
        nextShard(err)
      })
    }, () => {
      const finalGlobalHash = globalHash.digest()
      console.log('FINAL HASH', finalGlobalHash.toString('hex'), finalGlobalHash.toString('hex') === fileInfo.hmac.value)

      const nonParityChunk: Buffer[] = fileShards.map((x: any) => {
        return x.parity ? Buffer.alloc(0) : shards[x.index]
      })

      const nonParityFile = Buffer.concat(nonParityChunk)

      const fileDecipher = Aes256ctrDecrypter(fileKey.slice(0, 32), index.slice(0, 16))
      const decrypted = Buffer.concat([fileDecipher.update(nonParityFile), fileDecipher.final()])
      resolve(decrypted)
    })
  })

  return {
    name: fileInfo.filename,
    data: binary
  };
}