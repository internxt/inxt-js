import { GenerateFileKey, ripemd160, sha256HashBuffer, sha512HmacBuffer } from "../lib/crypto"
import { createEntryFromFrame, getBucketById, getFileById, request, streamRequest, CreateEntryFromFrameResponse, CreateEntryFromFrameBody, sendShardToNode, sendUploadExchangeReport } from "../services/request"
import { EnvironmentConfig } from ".."
import { GetFileMirror, FileInfo } from "./fileinfo"
import { ExchangeReport } from "./reports"
import { HashStream } from '../lib/hashstream'
import { Transform, Readable } from 'stream'
import { ShardMeta,  getShardMeta } from '../lib/shardMeta'
import { createFrame, addShardToFrame, FrameStaging } from '../services/request'
import Environment from "../lib/browser" 
import EncryptStream from "../lib/encryptStream"
import { FunnelStream } from "../lib/funnelStream"
import { ContractNegotiated } from '../lib/contracts'
import * as dotenv from 'dotenv'
import { print } from "../lib/utils/print"
dotenv.config({ path: '/home/inxt/inxt-js/.env' })

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

enum ERRORS {
  FILE_ALREADY_EXISTS = 'File already exists',
  FILE_NOT_FOUND = 'File not found',
  BUCKET_NOT_FOUND = 'Bucket not found',
}

enum CONTRACT_ERRORS {
  INVALID_SHARD_SIZES = 'Invalid shard sizes',
  NULL_NEGOTIATED_CONTRACT = 'Null negotiated contract'
}

enum NODE_ERRORS {
  INVALID_TOKEN = 'The supplied token is not accepted',
  REJECTED_SHARD = 'Node rejected shard',
  NO_SPACE_LEFT = 'No space left',
  NOT_CONNECTED_TO_BRIDGE = 'Not connected to bridge',
  UNABLE_TO_LOCATE_CONTRACT = 'Unable to locate contract',
  DATA_SIZE_IS_NOT_AN_INTEGER = 'Data size is not an integer',
  UNABLE_TO_DETERMINE_FREE_SPACE = 'Unable to determine free space',
  SHARD_HASH_NOT_MATCHES = 'Calculated hash does not match the expected result',
  SHARD_SIZE_BIGGER_THAN_CONTRACTED = 'Shard exceeds the amount defined in the contract'
}

export async function uploadFile(config: EnvironmentConfig, fileData: Readable, filename: string, bucketId: string, fileId: string, token: string) : Promise<CreateEntryFromFrameResponse> {
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
  
  const mnemonic = config.encryptionKey ? config.encryptionKey : ''
  const INDEX = process.env.TEST_INDEX ? process.env.TEST_INDEX : ''
  const ivStringified = process.env.TEST_IV ? process.env.TEST_IV : ''

  const bucketNotExists = () : Promise<boolean> => {
    return getBucketById(config, bucketId, fileId)
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
    return getFileById(config, bucketId, fileId)
      .then(() => true)
      .catch((err) => {
        if(err.message === ERRORS.FILE_NOT_FOUND) {
          return false
        } else {
          throw err
        }
      })
  }

  const stageFile = () : Promise<FrameStaging | void> => {
    return createFrame(config)
      .catch((err) => {
        console.log('staging file error:', err)
        // handle errors
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
    console.log(`Initial requests error:`, err.message)

    switch (err.statusText) {
      case ERRORS.FILE_NOT_FOUND:
        // continue
        break

      case ERRORS.FILE_ALREADY_EXISTS:
        // handle it 
      return Promise.reject(ERRORS.FILE_ALREADY_EXISTS)

      case ERRORS.BUCKET_NOT_FOUND:
        // handle it
      return Promise.reject(ERRORS.BUCKET_NOT_FOUND)

      default: 
        // handle it
      return Promise.reject('default error in switch')
    }
  }

  let response, frameId = ''

  try {
    if(response = await stageFile()) {
      frameId = response.id
    } else {
      throw new Error('Frame response empty')
    } 
  } catch (err) {
    console.log(`staging file error: ${err.message}`)
    // TODO: Handle errors
    return Promise.reject(err.message)
  }

  const fileEncryptionKey = await GenerateFileKey(mnemonic, bucketId, INDEX)
  const iv = Buffer.from(ivStringified, 'utf8')
  const encryptStream = new EncryptStream(fileEncryptionKey, iv)

  const shardSize = 50
  const funnel = new FunnelStream(shardSize)

  const uploadShardPromises: Promise<ShardMeta>[] = []

  return new Promise((
    resolve: ((res: CreateEntryFromFrameResponse) => void),
    reject:  ((reason: Error) => void)
  ) => {
    const outputStream: EncryptStream = fileData.pipe(funnel).pipe(encryptStream)

    outputStream.on('data', async (encryptedShard: Buffer) => {
      /* TODO: add retry attempts */
      print.green(`Encrypt Stream->callback: Encrypted chunk ${encryptedShard.toString('hex')}`)

      const shardRaw = funnel.shards.pop()

      if(shardRaw) {
        const { size, index } = shardRaw
        print.green(`Encrypt Stream: Raw shard size is ${size} bytes, index ${index}`)
        uploadShardPromises.push(UploadShard(config, size, index, encryptedShard, frameId))
      } else {
        print.red(`Encrypt Stream: Shardraw is null`)
      }
     
    })

    outputStream.on('error', (err) => {
      error(`Encrypt Stream: Error ${err}`)
      reject(err)
    })

    outputStream.on('end', async () => {
      print.green(`Encrypt Stream: Finished`)

      const uploadShardResponses = await Promise.all(uploadShardPromises)

      if(uploadShardResponses.length === 0) {
        reject(Error('No upload request has been made'))
      }

      const { totalShards } = funnel

      const generateHmac = () => {
        const hmacBuf = sha512HmacBuffer(fileEncryptionKey)

        if(uploadShardResponses) {
          for (let i = 0; i < totalShards; i++) {
            hmacBuf.update(uploadShardResponses[i].hash)
          }
        }        
  
        return hmacBuf.digest().toString('hex')
      }

      print.blue(`hmac ${generateHmac()}`)

      const saveFileBody: CreateEntryFromFrameBody = {
        frame: frameId,
        filename,
        index: INDEX,
        hmac: {
          type: 'sha512',
          value: generateHmac()
        }
      }

      // save file in inxt network
      const savingFileRequest = createEntryFromFrame(config, bucketId, saveFileBody)
      /* TODO: Handle errors */
      const savingFileResponse = await savingFileRequest

      print.green('Completed!')

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

const error = print.red