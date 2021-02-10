import { GenerateFileKey, ripemd160, sha256HashBuffer } from "../lib/crypto"
import { createEntryFromFrame, getBucketById, getFileById, request, streamRequest, CreateEntryFromFrameResponse, CreateEntryFromFrameBody } from "../services/request"
import { EnvironmentConfig } from ".."
import { GetFileMirror, FileInfo } from "./fileinfo"
import { ExchangeReport } from "./reports"
import { HashStream } from '../lib/hashstream'
import { Transform, Readable } from 'stream'
import { ShardMeta,  getShardMeta } from '../lib/shardMeta'
import { createFrame, addShardToFrame } from '../services/request'
import Environment from "../lib/browser"
import EncryptStream from "../lib/encryptStream"
import { ContractNegotiated } from '../lib/contracts'

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
export async function uploadFile(config: EnvironmentConfig, fileData: Readable, filename: string, bucketId: string, fileId: string, token: string, jwt: string) : Promise<CreateEntryFromFrameResponse> {
  // https://nodejs.org/api/stream.html#stream_readable_readablelength
  /*
  1. Check if bucket-id exists
  2. Check if file exists
  3. read source
  4. sharding process (just tokenize the original data)
  5. call upload shard -> pause the sharding process
  6. When the upload resolves [Promise] resume stream
  7. See 4.7 in UploadShard
  */

  enum ERRORS {
    FILE_ALREADY_EXISTS = 'File already exists',
    FILE_NOT_FOUND = 'File not found',
    BUCKET_NOT_FOUND = 'Bucket not found',
  }

  const mnemonic = config.encryptionKey ? config.encryptionKey : ''
  const INDEX = process.env.TEST_INDEX ? process.env.TEST_INDEX : ''
  const ivStringified = process.env.TEST_IV ? process.env.TEST_IV : ''

  const bucketNotExists = () : Promise<boolean> => {
    return getBucketById(config, bucketId, fileId, jwt)
      .then(() => false)
      .catch((err) => {
        if(err.message === ERRORS.BUCKET_NOT_FOUND) {
          return true
        } else {
          throw err
        }
      })
  }

  const fileExists = () : Promise<boolean> => {
    return getFileById(config, bucketId, fileId, jwt)
      .then(() => true)
      .catch((err) => {
        if(err.message === ERRORS.FILE_NOT_FOUND) {
          return false
        } else {
          throw err
        }
      })
  }

  try {
    if(await fileExists()) {
      throw new Error(ERRORS.FILE_ALREADY_EXISTS)
    }

    if(await bucketNotExists()) {
      throw new Error(ERRORS.BUCKET_NOT_FOUND)
    }
  } catch (err) {
    console.log(`Initial requests error: ${err}`)

    switch (err.message) {
      case ERRORS.FILE_NOT_FOUND:
        // continue
        break

      case ERRORS.FILE_ALREADY_EXISTS:
        // handle it 
      return 

      case ERRORS.BUCKET_NOT_FOUND:
        // handle it
      return

      default: 
        // handle it
      return
    }
  }

  const shardSize = 100
  const shard = Buffer.alloc(shardSize)
  const encryptedShard = Buffer.alloc(shardSize)

  const fileEncryptionKey = await GenerateFileKey(mnemonic, bucketId, INDEX)
  const iv = Buffer.from(ivStringified, 'utf8')
  const encryptStream = new EncryptStream(fileEncryptionKey, iv)

  encryptStream.on('data', (chunk: Buffer) => {
    Buffer.concat([encryptedShard, chunk])
  })

  // TODO: encryptStream.on('error')

  const stop = fileData.pause
  const resume = fileData.resume
  const encrypt = encryptStream.push
  const save = (chunk: Buffer) => {
    return {
      in: (place: Buffer) => {
        Buffer.concat([place, chunk])
      }
    }
  }
  const clean = (bufs: Buffer[]) : void => { bufs.map(buf => buf.fill(0)) }

  return new Promise((
    resolve: ((res: CreateEntryFromFrameResponse) => void),
    reject:  ((reason: Error) => void)
  ) => {
    /* read source */
    fileData.on('data', async (chunk: Buffer) => {
      if (shard.length < shardSize) {
        save(chunk).in(shard)
        encrypt(chunk)
      } else {
        stop()
        console.log('readable paused')

        console.log(`shard size ${shard.length}`)
        console.log(`encrypted shard size ${encryptedShard.length}`)

        /* TODO: Handle errors */
        await UploadShard(config, encryptedShard, bucketId, fileId, [])

        clean([shard, encryptedShard])

        resume()
        console.log('readable continues')
      }
    })

    fileData.on('error', (reason: string) => reject(Error(`reading stream error: ${reason}`)))

    fileData.on('end', async () => {
      const saveFileBody: CreateEntryFromFrameBody = {
        frame: '',
        filename: '',
        index: '',
        hmac: {
          type: '',
          value: ''
        }
      }

      const savingFileRequest = createEntryFromFrame(config, bucketId, saveFileBody, jwt)
      /* TODO: Handle errors */
      const savingFileResponse = await savingFileRequest

      if(savingFileResponse) {
        resolve(savingFileResponse)
      }
    })
  })
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
    const negotiatedContract: ContractNegotiated = addShardToFrame(EnvironmentConfig, frameId, shardMeta, jwt)
    //  4.3 Store shard in node (Post data to a node)
    //  4.4 Send exchange report
    //  4.5 Save file in inxt network (End of upload)
    // 5. Success
}
