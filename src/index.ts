import { Download } from './lib/download'
import * as fs from 'fs'
import StreamToBlob from 'stream-to-blob'
import BlobToStream from 'blob-to-stream'

import { FileToUpload, UploadFile as Upload } from "./api/shard"
import { CreateEntryFromFrameResponse } from './services/request'
import { Readable } from 'stream'
import { EncryptFilename } from './lib/crypto'
export * from './lib/crypto'
export * from './api/shard'

interface OnlyErrorCallback {
  (err: Error | null): void
}

interface DownloadProgressCallback {
  (progress: number, downloadedBytes: number | null, totalBytes: number | null): void
}

interface UploadProgressCallback {
  (progress: number, uploadedBytes: number | null, totalBytes: number | null) : void
}

export interface ResolveFileOptions {
  progressCallback: DownloadProgressCallback,
  finishedCallback: OnlyErrorCallback,
  overwritte?: boolean
}

interface UploadFileParams {
  filename: string,
  fileSize: number,
  fileContent: Blob
  progressCallback: UploadProgressCallback,
  finishedCallback: OnlyErrorCallback
}

export class Environment {
  private config: EnvironmentConfig

  constructor(config: EnvironmentConfig) {
    this.config = config
  }

  setEncryptionKey(newEncryptionKey: string): void {
    this.config.encryptionKey = newEncryptionKey
  }

  downloadFile(bucketId: string, fileId: string): Promise<Blob> {
    return Download(this.config, bucketId, fileId).then(stream => {
      return StreamToBlob(stream, 'application/octet-stream')
    })
  }

  async uploadFile(bucketId: string, data:UploadFileParams) : Promise<CreateEntryFromFrameResponse> {
    if (this.config.encryptionKey) {
      const { filename, fileSize: size, fileContent } = data
      const name = await EncryptFilename(this.config.encryptionKey, bucketId, filename)
      const content = BlobToStream(fileContent)

      const fileToUpload: FileToUpload = { content, name, size }

      return Upload(this.config, fileToUpload, bucketId)
    } else {
      return Promise.reject('Encryption key was not provided')
    }
  }

  /**
   * Exposed method for download testing. 
   * DO NOT USE IT FOR PRODUCTION USECASES
   * @param bucketId Bucket id where file is
   * @param fileId File id to download
   */
  labDownload (bucketId: string, fileId: string) : Promise<Readable> {
    return Download(this.config, bucketId, fileId)
  }

  /**
   * Exposed method for upload testing. 
   * DO NOT USE IT FOR PRODUCTION USECASES
   * @param bucketId Bucket id where file is
   * @param fileId File id to download
   */
  async labUpload (bucketId: string, file: FileToUpload) : Promise<CreateEntryFromFrameResponse> {
    if (this.config.encryptionKey) {
      const encryptedFilename = await EncryptFilename(this.config.encryptionKey, bucketId, file.name)
      file.name = encryptedFilename
      return Upload(this.config, file, bucketId)
    } else {
      return Promise.reject('Encryption key was not provided')
    }
  }

  resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): void {
    if (!options.overwritte && fs.existsSync(filePath)) {
      return options.finishedCallback(new Error('File already exists'))
    }

    const fileStream = fs.createWriteStream(filePath)

    Download(this.config, bucketId, fileId).then(stream => {
      console.log('START DUMPING FILE')
      const dump = stream.pipe(fileStream)
      dump.on('error', (err) => {
        console.log('DUMP FILE error', err.message)
        options.finishedCallback(err)
      })
      dump.on('end', (err) => {
        console.log('DUMP FILE END')
        options.finishedCallback(err)
      })
    })

    return
  }
}

export interface EnvironmentConfig {
  bridgeUrl?: string
  bridgeUser: string
  bridgePass: string
  encryptionKey?: string
  logLevel?: number
  webProxy?: string
  config?: {
    shardRetry: number
  }
}