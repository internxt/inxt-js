import BlobToStream from 'blob-to-stream';
import { Readable } from 'stream';
import { encode, reconstruct, utils } from 'rs-wrapper';
import { randomBytes } from 'crypto';

import { upload } from './lib/upload';
import { Download } from './lib/download';
import { EncryptFilename } from './lib/crypto';
import { logger } from './lib/utils/logger';

import { FileMeta } from "./api/FileObjectUpload";
import { CreateEntryFromFrameResponse } from './services/request';

import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes } from './api/ActionState';

import { DownloadOptionsAdapter as WebDownloadOptionsAdapter, WebDownloadFileOptions } from './api/adapters/Web';
import { DesktopDownloadFileOptions, DownloadOptionsAdapter as DesktopDownloadOptionsAdapter } from './api/adapters/Desktop';

export type OnlyErrorCallback = (err: Error | null) => void;

export type UploadFinishCallback = (err: Error | null, response: string | null) => void;

export type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;

export type DecryptionProgressCallback = (progress: number, decryptedBytes: number | null, totalBytes: number | null) => void;

export type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null)  => void;

export interface ResolveFileOptions {
  progressCallback: DownloadProgressCallback;
  finishedCallback: OnlyErrorCallback;
  overwritte?: boolean;
}

export interface DownloadFileOptions {
  progressCallback: DownloadProgressCallback;
  decryptionProgressCallback?: DecryptionProgressCallback;
  finishedCallback: DownloadFinishedCallback;
}

type GetInfoCallback = (err: Error | null, result: any)  => void;

type GetBucketsCallback = (err: Error | null, result: any)  => void;

type GetBucketIdCallback = (err: Error | null, result: any)  => void;

type CreateBucketCallback = (err: Error | null, result: any)  => void;

type DeleteBucketCallback = (err: Error | null, result: any)  => void;

type ListFilesCallback = (err: Error | null, result: any)  => void;

type DeleteFileCallback = (err: Error | null, result: any)  => void;

interface UploadFileParams {
  filename: string;
  fileSize: number;
  fileContent: Blob;
  progressCallback: UploadProgressCallback;
  finishedCallback: UploadFinishCallback;
}

interface StoreFileParams {
  filename: string;
  fileSize: number;
  fileContent: Readable;
  progressCallback: UploadProgressCallback;
  finishedCallback: UploadFinishCallback;
}

export class Environment {
  config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  /**
   * Gets general API info
   * @param cb Callback that will receive api's info
   */
  getInfo(cb: GetInfoCallback): void {
    /* TODO */
    cb(null, 'Not implemented yet');
  }

  /**
   * Gets list of available buckets
   * @param cb Callback that will receive the list of buckets
   */
  getBuckets(cb: GetBucketsCallback): void {
    /* TODO */
    cb(Error('Not implemented yet'), null);
  }

  /**
   * Gets a bucket id by name
   * @param bucketName Name of the bucket to be retrieved
   * @param cb Callback that will receive the bucket id
   */
  getBucketId(bucketName: string, cb: GetBucketIdCallback): void {
    /* TODO */
    cb(Error('Not implemented yet'), null);
  }

  /**
   * Creates a bucket
   * @param bucketName Name of the new bucket
   * @param cb Callback that will receive the response after creation
   */
  createBucket(bucketName: string, cb: CreateBucketCallback): void {
    /* TODO */
    cb(Error('Not implemented yet'), null);
  }

  /**
   * Deletes a bucket
   * @param bucketId Id whose bucket is going to be deleted
   * @param cb Callback that will receive the response after deletion
   */
  deleteBucket(bucketId: string, cb: DeleteBucketCallback): void {
    /* TODO */
    cb(Error('Not implemented yet'), null);
  }

  /**
   * Deletes a file from a bucket
   * @param bucketId Bucket id where file is
   * @param fileId Id of the file to be deleted
   * @param cb Callback that receives the response after deletion
   */
  deleteFile(bucketId: string, fileId: string, cb: DeleteFileCallback): void {
    /* TODO */
    cb(Error('Not implemented yet'), null);
  }

  /**
   * Lists files in a bucket
   * @param bucketId Bucket id whose files are going to be listed
   * @param cb Callback that receives the files list
   */
  listFiles(bucketId: string, cb: ListFilesCallback): void {
    /* TODO */
    cb(Error('Not implemented yet'), null);
  }

  setEncryptionKey(newEncryptionKey: string): void {
    this.config.encryptionKey = newEncryptionKey;
  }

  downloadFile(bucketId: string, fileId: string, options: WebDownloadFileOptions): ActionState {
    const downloadState = new ActionState(ActionTypes.DOWNLOAD);

    if (!this.config.encryptionKey) {
      options.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!bucketId) {
      options.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED), null);

      return downloadState;
    }

    Download(this.config, bucketId, fileId, WebDownloadOptionsAdapter(options), downloadState);

    return downloadState;
  }

  /**
   * Uploads a file from a web browser
   * @param bucketId Bucket id where file is going to be stored
   * @param params Upload file params
   */
  uploadFile(bucketId: string, params: UploadFileParams): void {
    if (!this.config.encryptionKey) {
      params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return;
    }

    if (!bucketId) {
      params.finishedCallback(Error('Bucket id was not provided'), null);

      return;
    }

    if (!params.filename) {
      params.finishedCallback(Error('Filename was not provided'), null);

      return;
    }

    if (params.fileContent.size === 0) {
      params.finishedCallback(Error('Can not upload a file with size 0'), null);

      return;
    }

    const { filename, fileSize: size, fileContent, progressCallback: progress, finishedCallback: finished } = params;

    EncryptFilename(this.config.encryptionKey, bucketId, filename)
      .then((name: string) => {
        logger.debug(`Filename ${filename} encrypted is ${name}`);

        const content = BlobToStream(fileContent);
        const fileToUpload: FileMeta = { content, name, size };

        upload(this.config, bucketId, fileToUpload, progress, finished);
      })
      .catch((err: Error) => {
        logger.error(`Error encrypting filename due to ${err.message}`);
        logger.error(err);

        finished(err, null);
      });
  }

  /**
   * Uploads a file from file system
   * @param bucketId Bucket id where file is going to be stored
   * @param params Store file params
   */
  storeFile(bucketId: string, params: StoreFileParams): ActionState {
    const uploadState = new ActionState(ActionTypes.UPLOAD);

    if (!this.config.encryptionKey) {
      params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!bucketId) {
      params.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    if (!params.filename) {
      params.finishedCallback(Error('Filename was not provided'), null);

      return uploadState;
    }

    if (params.fileSize === 0) {
      params.finishedCallback(Error('Can not upload a file with size 0'), null);

      return uploadState;
    }

    EncryptFilename(this.config.encryptionKey, bucketId, params.filename)
      .then((name: string) => {
        logger.debug('Filename %s encrypted is %s', params.filename, name);

        const fileToUpload: FileMeta = { content: params.fileContent, name, size: params.fileSize };

        upload(this.config, bucketId, fileToUpload, params.progressCallback, params.finishedCallback);
      })
      .catch((err: Error) => {
        params.finishedCallback(err, null);
      });

    return uploadState;
  }

  resolveFile(bucketId: string, fileId: string, options: DesktopDownloadFileOptions): ActionState {
    const downloadState = new ActionState(ActionTypes.DOWNLOAD);

    if (!this.config.encryptionKey) {
      options.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!bucketId) {
      options.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED), null);

      return downloadState;
    }

    Download(this.config, bucketId, fileId, DesktopDownloadOptionsAdapter(options), downloadState);

    return downloadState;
  }

  /**
   * Downloads a file, returns state object
   * @param bucketId Bucket id where file is
   * @param fileId Id of the file to be downloaded
   * @param filePath File path where the file maybe already is
   * @param options Options for resolve file case
   */
  // resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): void {
  //   if (!options.overwritte && fs.existsSync(filePath)) {
  //     return options.finishedCallback(new Error('File already exists'))
  //   }

  //   const fileStream = fs.createWriteStream(filePath)

  //   Download(this.config, bucketId, fileId, options).then(stream => {
  //     console.log('START DUMPING FILE')
  //     const dump = stream.pipe(fileStream)
  //     dump.on('error', (err) => {
  //       console.log('DUMP FILE error', err.message)
  //       options.finishedCallback(err)
  //     })
  //     dump.on('end', (err) => {
  //       console.log('DUMP FILE END')
  //       options.finishedCallback(err)
  //     })
  //   })

  //   /* TODO: Returns state object */
  //   return
  // }

  /**
   * Cancels the download
   * @param state Download file state at the moment
   */
  resolveFileCancel(state: ActionState): void {
    state.stop();
  }

}

export function rsTest(size: number) {
  const buffer = randomBytes(size);
  console.log(buffer.length);
  const shardSize = utils.determineShardSize(size);
  const nShards = Math.ceil(size / shardSize);
  const parityShards = utils.determineParityShards(nShards);

  return encode(buffer, shardSize, nShards, parityShards).then((file) => {
    file[1] = 'g'.charCodeAt(0);
    const totalShards = nShards + parityShards;

    const arr: boolean[] = new Array(totalShards).fill(true);
    arr[0] = false;

    return reconstruct(file, nShards, parityShards, arr);
  });
}

export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  webProxy?: string;
  config?: {
    shardRetry: number
  };
}
