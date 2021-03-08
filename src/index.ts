import { Download } from './lib/download'
import * as fs from 'fs'
import StreamToBlob from 'stream-to-blob'
import BlobToStream from 'blob-to-stream'

import { FileToUpload } from "./api/shard"
import { Readable } from 'stream'
import { EncryptFilename } from './lib/crypto'
import { Upload } from './lib/upload'
import { CreateEntryFromFrameResponse } from './services/request'
export * from './lib/crypto'
export * from './api/shard'

export interface OnlyErrorCallback {
  (err: Error | null): void
}

export interface UploadFinishCallback {
  (err: Error | null, response: CreateEntryFromFrameResponse | null): void
}

export interface DownloadProgressCallback {
  (progress: number, downloadedBytes: number | null, totalBytes: number | null): void
}

export interface UploadProgressCallback {
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
  finishedCallback: UploadFinishCallback
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

  uploadFile(bucketId: string, data:UploadFileParams) : void {
    if (!this.config.encryptionKey) {
      throw new Error('Mnemonic was not provided, please, provide a mnemonic')
    }

    const { filename, fileSize: size, fileContent, progressCallback: progress, finishedCallback: finished } = data

    EncryptFilename(this.config.encryptionKey, bucketId, filename)
      .then((name: string) => {
        const content = BlobToStream(fileContent) 
        const fileToUpload: FileToUpload = { content, name, size }

        Upload(this.config, bucketId, fileToUpload, progress, finished)
      })
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
  labUpload (bucketId: string, file: FileToUpload) : void {
    if (!this.config.encryptionKey) {
      throw new Error('Mnemonic was not provided, please, provide a mnemonic')
    }

    EncryptFilename(this.config.encryptionKey, bucketId, file.name)
      .then((name: string) => {
        file.name = name

        Upload(this.config, bucketId, file, (progress: number, uploadedBytes: number | null, totalBytes: number | null) => {
          console.log(`progress ${progress}%`)
          console.log(`uploaded ${uploadedBytes} from ${totalBytes}`)
        }, (err: Error | null) => {
          if (err) {
            console.error(`Error during upload due to ${err.message}`)
          } else {
            console.log('finished upload correctly!')
          }
        })
      })
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