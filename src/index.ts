import { Download } from './lib/download'
import * as fs from 'fs'
import StreamToBlob from 'stream-to-blob'
import BlobToStream from 'blob-to-stream'

import { FileToUpload, UploadFile as Upload } from "./api/shard"
import { CreateEntryFromFrameResponse } from './services/request'

interface OnlyErrorCallback {
  (err: Error | null): void
}
interface DownloadProgressCallback {
  (progress: number, downloadedBytes: number | null, totalBytes: number | null): void
}
export interface ResolveFileOptions {
  progressCallback: DownloadProgressCallback,
  finishedCallback: OnlyErrorCallback,
  overwritte?: boolean
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

  uploadFile(bukcetId: string, filename: string, filesize: number, fileId: string, content: Blob) : Promise<CreateEntryFromFrameResponse> {
    const file: FileToUpload = {
      content: BlobToStream(content),
      id: fileId,
      name: filename,
      size: filesize
    }

    return Upload(this.config, file, bukcetId)
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