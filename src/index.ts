import * as fs from 'fs'
import { Readable } from 'stream'
import StreamToBlob from 'stream-to-blob'
import BlobToStream from 'blob-to-stream'

import { Upload } from './lib/upload'
import { Download } from './lib/download'
import { EncryptFilename } from './lib/crypto'

import { FileToUpload } from "./api/shard"
import { CreateEntryFromFrameResponse } from './services/request'

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

export interface DownloadFileOptions {
  progressCallback: DownloadProgressCallback,
  finishedCallback: OnlyErrorCallback
}

interface GetInfo {
  (err: Error | null, result: any) : void
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

  /**
   * Gets general API info
   * @param cb Callback that will receive api's info
   */
  getInfo(cb: GetInfo) : void {
    /* TODO */
    cb(null, 'Not implemented yet')
  }

  setEncryptionKey(newEncryptionKey: string): void {
    this.config.encryptionKey = newEncryptionKey
  }

  downloadFile(bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Blob> {
    return Download(this.config, bucketId, fileId, options).then(stream => {
      options.finishedCallback(null)
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
  labDownload (bucketId: string, fileId: string, options: DownloadFileOptions) : Promise<Readable> {
    return Download(this.config, bucketId, fileId, options)
  }

  /**
   * Exposed method for upload testing. 
   * DO NOT USE IT FOR PRODUCTION USECASES
   * @param bucketId Bucket id where file is
   * @param fileId File id to download
   */
  labUpload (bucketId: string, file: FileToUpload, progress: UploadProgressCallback, finish: UploadFinishCallback) : void {
    if (!this.config.encryptionKey) {
      throw new Error('Mnemonic was not provided, please, provide a mnemonic')
    }

    EncryptFilename(this.config.encryptionKey, bucketId, file.name)
      .then((name: string) => {
        file.name = name

        Upload(this.config, bucketId, file, progress, finish)
      })
  }

  resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): void {
    if (!options.overwritte && fs.existsSync(filePath)) {
      return options.finishedCallback(new Error('File already exists'))
    }

    const fileStream = fs.createWriteStream(filePath)

    Download(this.config, bucketId, fileId, options).then(stream => {
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