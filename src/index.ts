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

interface GetInfoCallback {
  (err: Error | null, result: any) : void
}

interface GetBucketsCallback {
  (err: Error | null, result: any) : void
}

interface GetBucketIdCallback {
  (err: Error | null, result: any) : void
}

interface CreateBucketCallback {
  (err: Error | null, result: any) : void
}

interface DeleteBucketCallback {
  (err: Error | null, result: any) : void
}

interface ListFilesCallback {
  (err: Error | null, result: any) : void
}

interface DeleteFileCallback {
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
  getInfo(cb: GetInfoCallback) : void {
    /* TODO */
    cb(null, 'Not implemented yet')
  }

  /**
   * Gets list of available buckets
   * @param cb Callback that will receive the list of buckets
   */
  getBuckets(cb: GetBucketsCallback) : void {
    /* TODO */
    cb(Error('Not implemented yet'), null)
  }

  /**
   * Gets a bucket id by name
   * @param bucketName Name of the bucket to be retrieved
   * @param cb Callback that will receive the bucket id
   */
  getBucketId(bucketName: string, cb: GetBucketIdCallback) : void {
    /* TODO */
    cb(Error('Not implemented yet'), null)
  }

  /**
   * Creates a bucket
   * @param bucketName Name of the new bucket
   * @param cb Callback that will receive the response after creation
   */
  createBucket(bucketName:string, cb: CreateBucketCallback) : void {
    /* TODO */
    cb(Error('Not implemented yet'), null)
  }

  /**
   * Deletes a bucket
   * @param bucketId Id whose bucket is going to be deleted
   * @param cb Callback that will receive the response after deletion
   */
  deleteBucket(bucketId: string, cb: DeleteBucketCallback) : void {
    /* TODO */
    cb(Error('Not implemented yet'), null)
  }

  /**
   * Deletes a file from a bucket
   * @param bucketId Bucket id where file is
   * @param fileId Id of the file to be deleted
   * @param cb Callback that receives the response after deletion
   */
  deleteFile(bucketId: string, fileId: string, cb: DeleteFileCallback) : void {
    /* TODO */
    cb(Error('Not implemented yet'), null)
  }

  /**
   * Lists files in a bucket
   * @param bucketId Bucket id whose files are going to be listed
   * @param cb Callback that receives the files list
   */
  listFiles(bucketId: string, cb: ListFilesCallback) : void {
    /* TODO */
    cb(Error('Not implemented yet'), null)
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

  /**
   * Downloads a file, returns state object
   * @param bucketId Bucket id where file is
   * @param fileId Id of the file to be downloaded
   * @param filePath File path where the file maybe already is
   * @param options Options for resolve file case
   */
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

    /* TODO: Returns state object */
    return
  }

  /**
   * Cancels the upload
   * @param state Download file state at the moment
   */
  resolveFileCancel(state: any) : void {
    throw new Error('Not implemented yet')
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