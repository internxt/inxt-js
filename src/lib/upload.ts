import { EnvironmentConfig, UploadProgressCallback, OnlyErrorCallback } from ".."
import { FileObjectUpload, FileMeta } from "../api/FileObjectUpload"
import EncryptStream from "./encryptStream"

import { ShardMeta } from '../lib/shardMeta'

import * as api from '../services/request'


export function Upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, progress: UploadProgressCallback, finish: OnlyErrorCallback) : void {
    if (!config.encryptionKey) {
        throw new Error('Encryption key')
    }

    const File = new FileObjectUpload(config, fileMeta, bucketId)

    File.init().then(() => File.StartUploadFile()).then((out: EncryptStream) => {
        return new Promise((resolve, reject) => {
            const totalBytes = fileMeta.size
            let uploadedBytes = 0
            let progressCounter = 0

            const uploadShardPromises: Promise<ShardMeta>[] = []

            progress(0, uploadedBytes, totalBytes)

            out.on('data', async (encryptedShard: Buffer) => {
                const rawShard = out.shards.pop()

                if(!rawShard) {
                    finish(Error('Shard encrypted was null'))
                    return reject()
                }
                
                const { size, index } = rawShard

                if(size !== encryptedShard.length) {
                    finish(Error(`size registered and size encrypted do not match`))
                    return reject()
                }

                const generateShardPromise = async () : Promise<ShardMeta> => {
                    console.log('Sending shard')
                    const response = await File.UploadShard(encryptedShard, size, File.frameId, index, 3)

                    console.log('Shard uploaded')
                    uploadedBytes += size
                    progressCounter += (size / totalBytes) * 100

                    progress(progressCounter, uploadedBytes, totalBytes)

                    return response
                }

                uploadShardPromises.push(generateShardPromise())
            })

            out.on('error', (err: Error) => {
                finish(err)
                return reject()
            })

            out.on('end', async () => {
                try {
                    const uploadShardResponses = await Promise.all(uploadShardPromises)

                    if(uploadShardResponses.length === 0) {
                        finish(Error('No upload requests has been made'))
                        return reject()
                    }

                    const bucketEntry : api.CreateEntryFromFrameBody = {
                        frame: File.frameId,
                        filename: fileMeta.name,
                        index: File.index.toString('hex'),
                        hmac: {
                            type: 'sha512',
                            value: File.GenerateHmac(uploadShardResponses)
                        }
                    }

                    const savingFileResponse = await File.SaveFileInNetwork(bucketEntry)

                    if(!savingFileResponse) {
                        finish(Error('Saving file response was null'))
                        return reject()
                    } 

                    progress(100, totalBytes, totalBytes)

                    finish(null)
                    return resolve(null)
                } catch (err) {
                    finish(Error(err.message))
                    return reject()
                }
            })
        })
    })    
}