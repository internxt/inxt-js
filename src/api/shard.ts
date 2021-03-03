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
import { randomBytes } from 'crypto'
import { computeShardSize } from "../lib/utils/shard"
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

async function bucketNotExists (config: EnvironmentConfig, bucketId: string) : Promise<boolean> {
  try {
    await getBucketById(config, bucketId)
    return false
  } catch (err) {
    if (err.message === ERRORS.BUCKET_NOT_FOUND) {
      return true
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

function generateHmac(fileEncryptionKey: Buffer, shardMetas: ShardMeta[]) : string {
  const hmacBuf = sha512HmacBuffer(fileEncryptionKey)

  if(shardMetas) {
    for (let i = 0; i < shardMetas.length; i++) {
      hmacBuf.update(Buffer.from(shardMetas[i].hash, 'hex'))
    }
  }

  return hmacBuf.digest().toString('hex')
}

function handleOutputStreamError(err: Error, reject: ((reason: Error) => void)) : void {
  print.red(`Output stream error ${err}`)
  reject(err)
}

export interface FileToUpload {
  size: number
  name: string,
  content: Readable
}

export async function UploadFile(config: EnvironmentConfig, file: FileToUpload, bucketId: string) : Promise<CreateEntryFromFrameResponse> {    
  const mnemonic = config.encryptionKey ? config.encryptionKey : ''
  const INDEX = randomBytes(32)

  let response, frameId = ''

  try {
    // TODO: Check if file already exists by its name
    if(await bucketNotExists(config, bucketId)) {
      throw new Error(ERRORS.BUCKET_NOT_FOUND)
    }

    if(response = await stageFile(config)) {
      frameId = response.id
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

  const fileEncryptionKey = await GenerateFileKey(mnemonic, bucketId, INDEX)
  const encryptStream = new EncryptStream(fileEncryptionKey, INDEX.slice(0,16))

  const shardSize = computeShardSize(file.size)
  const funnel = new FunnelStream(shardSize)

  const uploadShardPromises: Promise<ShardMeta>[] = []

  return new Promise((
    resolve: ((res: CreateEntryFromFrameResponse) => void),
    reject:  ((reason: Error) => void)
  ) => {
    const outputStream: EncryptStream = file.content.pipe(funnel).pipe(encryptStream)

    outputStream.on('data', async (encryptedShard: Buffer) => {
      /* TODO: add retry attempts */
      // print.green(`Encrypt Stream->callback: Encrypted chunk ${encryptedShard.toString('hex')}`)

      const shardRaw = funnel.shards.pop()

      if(shardRaw) {
        const { size, index } = shardRaw
        print.green(`Encrypt Stream: Raw shard size is ${size} bytes (without filling with zeroes), index ${index}`)
        uploadShardPromises.push(UploadShard(config, size, index, encryptedShard, frameId, 3))
      } else {
        print.red(`Encrypt Stream: Shardraw is null`)
      }
     
    })

    outputStream.on('error', handleOutputStreamError)

    outputStream.on('end', async () => {
      print.green(`Encrypt Stream: Finished`)

      try {
        const uploadShardResponses = await Promise.all(uploadShardPromises) || []

        if (uploadShardResponses.length == 0) throw new Error('No upload requests has been made')

        print.blue(`hmac ${generateHmac(fileEncryptionKey, uploadShardResponses)}`)

        const saveFileBody: CreateEntryFromFrameBody = {
          frame: frameId,
          filename: file.name,
          index: INDEX.toString('hex'),
          hmac: {
            type: 'sha512',
            value: generateHmac(fileEncryptionKey, uploadShardResponses)
          }
        }

        const savingFileResponse = await saveFileInNetwork(config, bucketId, saveFileBody)

        if(!savingFileResponse) throw new Error('Saving file response was null')

        resolve(savingFileResponse)
      } catch (e) {
        reject(e)
      }          
    })
  })
}

export async function UploadShard(config: EnvironmentConfig, shardSize: number, index: number, encryptedShardData: Buffer, frameId: string, attemps: number): Promise<ShardMeta> {  
  // Generate shardMeta
  const shardMeta: ShardMeta = getShardMeta(encryptedShardData, shardSize, index, false)

  // Debug
  const printHeader = `UploadShard(Shard: ${shardMeta.hash})`

  // Prepare exchange report
  const exchangeReport = new ExchangeReport(config)

  const negotiateContract = () => {
    return addShardToFrame(config, frameId, shardMeta)
  } 

  const abort = () => Promise.reject('Retry attempts to upload shard failed')

  const retry = async () => {
    attemps--
    return await UploadShard(config, shardSize, index, encryptedShardData, frameId, attemps)
  }

  let negotiatedContract: ContractNegotiated | void
  let token = "", operation = ""
  let farmer = { userAgent: "", protocol: "", address: "", port: 0, nodeID: "", lastSeen: new Date() }

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

    if(attemps > 1) {
      return await retry()
    } else {
      return await abort()
    }
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

    if(attemps > 1) {
      return await retry()
    } else {
      return await abort()
    }

  }

  return shardMeta
}

const error = print.red