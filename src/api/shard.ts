import { GenerateFileKey, ripemd160, sha512HmacBuffer } from "../lib/crypto"
import { createEntryFromFrame, getBucketById, getFileById, streamRequest, CreateEntryFromFrameResponse, CreateEntryFromFrameBody, sendShardToNode, sendUploadExchangeReport } from "../services/request"
import { EnvironmentConfig } from ".."
import { GetFileMirror } from "./fileinfo"
import { ExchangeReport } from "./reports"
import { HashStream } from '../lib/hashstream'
import { Transform, Readable } from 'stream'
import { ShardMeta,  getShardMeta } from '../lib/shardMeta'
import { createFrame, addShardToFrame, FrameStaging } from '../services/request'
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

async function bucketNotExists (config: EnvironmentConfig, bucketId: string, fileId: string) : Promise<boolean> {
  try {
    await getBucketById(config, bucketId, fileId)
    return false
  } catch (err) {
    if (err.message === ERRORS.BUCKET_NOT_FOUND) {
      return true
    } else {
      return Promise.reject(err)
    }
  }
}

async function fileExists (config: EnvironmentConfig, bucketId: string, fileId: string) : Promise<boolean> {
  try {
    await getFileById(config, bucketId, fileId)
    return true
  } catch (err) {
    if(err.message === ERRORS.FILE_NOT_FOUND) {
      return false
    } else {
      return Promise.reject(err)
    }
  }
}

async function stageFile (config: EnvironmentConfig) : Promise<FrameStaging | void> {
  try {
    return await createFrame(config)
  } catch (err) {
    print.red(`Stage file error ${err.message}`)
  }
}

async function saveFileInNetwork(config: EnvironmentConfig, bucketId: string, bucketEntry: CreateEntryFromFrameBody) : Promise<void | CreateEntryFromFrameResponse> {
  try {
    return await createEntryFromFrame(config, bucketId, bucketEntry)
  } catch (e) {
    // TODO: Handle it
    print.red(e.message)
  }
}

function handleOutputStreamError(err: Error, reject: ((reason: Error) => void)) : void {
  print.red(`Output stream error ${err}`)
  reject(err)
}

export async function uploadFile(config: EnvironmentConfig, fileData: Readable, filename: string, bucketId: string, fileId: string) : Promise<CreateEntryFromFrameResponse> {  
  const mnemonic = config.encryptionKey ? config.encryptionKey : ''
  const INDEX = process.env.TEST_INDEX ? process.env.TEST_INDEX : ''
  const ivStringified = process.env.TEST_IV ? process.env.TEST_IV : ''

  try {
    if(await fileExists(config, bucketId, fileId)) {
      throw new Error(ERRORS.FILE_ALREADY_EXISTS)
    }

    if(await bucketNotExists(config, bucketId, fileId)) {
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
    if(response = await stageFile(config)) {
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
        print.green(`Encrypt Stream: Raw shard size is ${size} bytes (without filling with zeroes), index ${index}`)
        uploadShardPromises.push(UploadShard(config, shardSize, index, encryptedShard, frameId))
      } else {
        print.red(`Encrypt Stream: Shardraw is null`)
      }
     
    })

    outputStream.on('error', handleOutputStreamError)

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

      const savingFileResponse = await saveFileInNetwork(config, bucketId, saveFileBody)

      if(!savingFileResponse) { 
        // handle it 
        reject(Error('Empty saving file response'))
      } else {
        resolve(savingFileResponse)  
      }
          
    })
  })
}

export async function UploadShard(config: EnvironmentConfig, shardSize: number, index: number, encryptedShardData: Buffer, frameId: string): Promise<ShardMeta> {  
  // Generate shardMeta
  const shardMeta: ShardMeta = getShardMeta(encryptedShardData, shardSize, index, false)

  // Debug
  const printHeader = `UploadShard(Shard: ${shardMeta.hash})`

  // Prepare exchange report
  const exchangeReport = new ExchangeReport(config)

  const negotiateContract = () => {
    return addShardToFrame(config, frameId, shardMeta)
  } 

  let negotiatedContract: ContractNegotiated | void
  let token, farmer, operation

  try {
    if(negotiatedContract = await negotiateContract()) {

      token = negotiatedContract.token
      operation = negotiatedContract.operation
      farmer = { ...negotiatedContract.farmer, lastSeen: new Date() }

      print.green(`${printHeader}: Contract negotiated with auth token ${token}`)
    } else {
      throw new Error('Null negotiated contract')
    }
  } catch (e) {
    error(`${printHeader}: Negotiated contract went wrong, received ${e.err.status} response status`)

    if (e.message === CONTRACT_ERRORS.INVALID_SHARD_SIZES) {
      // TODO: Handle it
      error('It seems that the shard size is invalid')
    } else if (e.message === CONTRACT_ERRORS.NULL_NEGOTIATED_CONTRACT) {
      // TODO: Handle it
      error('It seems that the negotiated contract is null')
    } else {
      // TODO: Handle it
      error(`Unknown error ${e.message}`)
    }

    return
  }

  const hash = shardMeta.hash
  const parity = false // TODO: When is true in this context?
  // TODO: Replace count
  const shard: Shard = { index, replaceCount: 0, hash, size: shardSize, parity, token, farmer, operation }

  print.blue(`${printHeader}: Sending shard to node`)

  const nodeRejectedShard = () : Promise<boolean> => {
    return sendShardToNode(config, shard.hash, shard.token, shard.farmer.address, shard.farmer.port, shard.farmer.nodeID, encryptedShardData)
      .then(() => {
        print.green(`${printHeader}: Node accepted shard`)
        return false
      })
      .catch((err) => {
        print.red(`${printHeader}: Node ${shard.farmer.nodeID} rejected Shard with index ${index} because ${err.message.toLowerCase()}`)
        const knownError = err.message in NODE_ERRORS

        print.red(`Shard size is ${shardSize}, shard negotiated in contract ${encryptedShardData.length}`)

        if(knownError) {

          if(err.message === NODE_ERRORS.SHARD_SIZE_BIGGER_THAN_CONTRACTED) {
            print.red(`Shard size is ${shardSize}, shard negotiated in contract ${encryptedShardData.length}`)
          }

          return true
        } else {
          throw err
        }
      })
  }

  exchangeReport.params.dataHash = shard.hash
  exchangeReport.params.exchangeEnd = new Date()
  exchangeReport.params.farmerId = shard.farmer.nodeID

  try {
    if(await nodeRejectedShard()) {
      exchangeReport.DownloadError()
      await exchangeReport.sendReport()
      throw new Error(NODE_ERRORS.REJECTED_SHARD)
    } else {
      exchangeReport.DownloadOk()
      await exchangeReport.sendReport()
    }  
    await sendUploadExchangeReport(config, exchangeReport)
  } catch (e) {
    error(`${printHeader}: Error for shard with index ${index} is ${e.message}`)
  }

  return shardMeta
}

const error = print.red