import { EnvironmentConfig } from '../index'
import { GetFileInfo, GetFileMirrors } from '../api/fileinfo'
import { GenerateFileKey, sha512HmacBuffer, sha256, ripemd160, Aes256ctrDecrypter } from './crypto'
import { eachSeries } from 'async'
import { DownloadShard } from '../api/shard'
import {Transform} from 'stream'

export default async function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<any> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required')
  }

  // API request file info
  const fileInfo = await GetFileInfo(config, bucketId, fileId)

  // API request file mirrors with tokens
  const fileShards = await GetFileMirrors(config, bucketId, fileId)

  // Prepare file keys to decrypt
  const index = Buffer.from(fileInfo.index, 'hex')
  const fileKey = await GenerateFileKey(config.encryptionKey, bucketId, index)

  const shards: Buffer[] = []
  const binary = await new Promise(resolve => {
    const globalHash = sha512HmacBuffer(fileKey)
    eachSeries(fileShards, async (shard: any, nextShard: Function) => {
      DownloadShard(config, fileInfo, shard, bucketId, fileId).then((shardData: Transform) => {
        /*
        const shardHash = sha256(shardData)
        const rpm = ripemd160(shardHash)
        globalHash.update(rpm)
        shards.push(shardData)
        */
        nextShard()
      }).catch(err => {
        console.error(err)
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