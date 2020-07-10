import { EnvironmentConfig } from '../index'
import { GetFileInfo, GetFileMirrors } from '../api/fileinfo'
import { GenerateFileKey, sha512HmacBuffer, sha256, ripemd160, Aes256ctrDecrypter } from './crypto'
import { eachSeries } from 'async'
import { DownloadShard } from '../api/shard'

export default async function Download(config: EnvironmentConfig, bucketId: string, fileId: string) {
  if (!config.encryptionKey) {
    throw Error('Encryption key required')
  }

  const fileInfo = await GetFileInfo(config, bucketId, fileId)
  const fileShards = await GetFileMirrors(config, bucketId, fileId)

  const index = Buffer.from(fileInfo.index, 'hex')
  const fileKey = await GenerateFileKey(config.encryptionKey, bucketId, index)

  const shards: Buffer[] = []
  const binary = await new Promise(resolve => {
    const globalHash = sha512HmacBuffer(fileKey)
    eachSeries(fileShards, (shard: any, nextShard: Function) => {
      DownloadShard(config, shard, bucketId, fileId).then((shardData: any) => {
        const shardHash = sha256(shardData)
        const rpm = ripemd160(shardHash)
        globalHash.update(rpm)
        console.log('Shard hash', rpm.toString('hex'))
        shards.push(shardData)
        nextShard()
      }).catch(err => {
        nextShard(err)
      })
    }, () => {
      const finalGlobalHash = globalHash.digest()
      console.log('FINAL HASH', finalGlobalHash.toString('hex'), finalGlobalHash.toString('hex') === fileInfo.hmac.value)

      const nonParityChunk = fileShards.map((x: any) => {
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