import { EnvironmentConfig } from '../index'
import { GetFileInfo, GetFileMirrors } from '../api/fileinfo'
import { Aes256ctrDecrypter } from './crypto'
import { eachLimit } from 'async'
import { DownloadShard, Shard } from '../api/shard'
import { Transform } from 'stream'
import { GlobalHash } from './hashglobalstream'
import crypto from 'crypto'
import { FileObject } from '../api/FileObject'

export default async function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<any> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required')
  }

  const File = new FileObject(config, bucketId, fileId)
  await File.GetFileInfo()

  File.on('end', () => {
    console.log('FILE END')
  })

  File.on('progress', (t, s, p) => {
    if (p ===1 ) {
      setTimeout(() => {}, 15000)
    }
  })

  // API request file mirrors with tokens
  await File.GetFileMirrors()

  await File.StartDownloadFile()
  return
  /*
    const shards: Transform[] = []
    const binary = await new Promise(resolve => {
      eachLimit(fileShards, 4, async (shard: Shard, nextShard: Function) => {
        console.log('DOWNLOAD SHARD %s', shard.index)
        DownloadShard(config, shard, bucketId, fileId).then((shardData: Transform) => {
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
  
        const nonParityChunk: Transform[] = fileShards.map((x: any) => {
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
    }
    */
}