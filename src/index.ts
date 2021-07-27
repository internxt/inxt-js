import BlobToStream from 'blob-to-stream';
import { Readable } from 'stream';
import { createReadStream, createWriteStream, existsSync, statSync } from 'fs';
import * as Winston from 'winston';

import { upload } from './lib/upload';
import { download } from './lib/download';
import { EncryptFilename } from './lib/crypto';

import { FileMeta } from "./api/FileObjectUpload";
import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes } from './api/ActionState';
import { DownloadOptionsAdapter as WebDownloadOptionsAdapter, WebDownloadFileOptions } from './api/adapters/Web';
import { DesktopDownloadFileOptions, DownloadOptionsAdapter as DesktopDownloadOptionsAdapter } from './api/adapters/Desktop';
import { logger, Logger } from './lib/utils/logger';
import { basename } from 'path';
import streamToBlob from 'stream-to-blob';

export type OnlyErrorCallback = (err: Error | null) => void;

export type UploadFinishCallback = (err: Error | null, response: string | null) => void;

export type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;

export type DecryptionProgressCallback = (progress: number, decryptedBytes: number | null, totalBytes: number | null) => void;

export type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null)  => void;

export interface UploadFileOptions {
  progressCallback: UploadProgressCallback;
  finishedCallback: UploadFinishCallback;
}

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

type DebugCallback = (message: string) => void;

interface UploadFileParams {
  filename: string;
  fileSize: number;
  fileContent: Blob;
  progressCallback: UploadProgressCallback;
  finishedCallback: UploadFinishCallback;
}

interface StoreFileParams extends UploadFileOptions {
  debug?: DebugCallback;
}

interface ResolveFileParams extends DownloadFileOptions {
  debug?: DebugCallback;
}

export class Environment {
  config: EnvironmentConfig;
  logger: Winston.Logger;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.logger = Logger.getInstance(1);
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
    const downloadState = new ActionState(ActionTypes.Download);

    if (!this.config.encryptionKey) {
      options.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!bucketId) {
      options.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED), null);

      return downloadState;
    }

    download(this.config, bucketId, fileId, options.progressCallback, this.logger, downloadState)
      .then((downloadStream) => {
        return streamToBlob(downloadStream, 'application/octet-stream');
      }).then((blob) => {
        options.finishedCallback(null, blob);
      }).catch((err) => {
        options.finishedCallback(err, null);
      });

    return downloadState;
  }

  /**
   * Uploads a file from a web browser
   * @param bucketId Bucket id where file is going to be stored
   * @param params Upload file params
   */
  uploadFile(bucketId: string, params: UploadFileParams): void {
    const uploadState = new ActionState(ActionTypes.Upload);

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

    const { filename, fileSize: size, fileContent } = params;

    EncryptFilename(this.config.encryptionKey, bucketId, filename)
      .then((name: string) => {
        this.logger.debug('Filename %s encrypted is %s', filename, name);

        const content = BlobToStream(fileContent);
        const fileToUpload: FileMeta = { content, name, size };

        upload(this.config, bucketId, fileToUpload, params, this.logger, uploadState);
      })
      .catch((err: Error) => {
        this.logger.error(`Error encrypting filename due to ${err.message}`);
        this.logger.error(err);

        params.finishedCallback(err, null);
      });
  }

  /**
   * Uploads a file from file system
   * @param bucketId Bucket id where file is going to be stored
   * @param params Store file params
   */
  storeFile(bucketId: string, filepath: string, params: StoreFileParams): ActionState {
    const uploadState = new ActionState(ActionTypes.Upload);

    if (!this.config.encryptionKey) {
      params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!bucketId) {
      params.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    const fileStat = statSync(filepath);

    if (fileStat.size === 0) {
      params.finishedCallback(Error('Can not upload a file with size 0'), null);

      return uploadState;
    }

    if (params.debug) {
      this.logger = Logger.getDebugger(this.config.logLevel || 1, params.debug);
    }

    const filename = basename(filepath);

    EncryptFilename(this.config.encryptionKey, bucketId, filename)
      .then((name: string) => {
        logger.debug('Filename %s encrypted is %s', filename, name);

        const fileMeta: FileMeta = { content: createReadStream(filepath), name, size: fileStat.size };

        return upload(this.config, bucketId, fileMeta, params, this.logger, uploadState);
      }).then(() => {
        this.logger.info('Upload Success!');
      }).catch((err: Error) => {
        if (err && err.message && err.message.includes('Upload aborted')) {
          return params.finishedCallback(new Error('Process killed by user'), null);
        }
        params.finishedCallback(err, null);
      });

    return uploadState;
  }

  /**
   * Cancels a file upload
   * @param {ActionState} state Upload state
   */
  storeFileCancel(state: ActionState): void {
    state.stop();
  }

  /**
   * Downloads a file, returns state object
   * @param bucketId Bucket id where file is
   * @param fileId Id of the file to be downloaded
   * @param filePath File path where the file maybe already is
   * @param options Options for resolve file case
   */
  resolveFile(bucketId: string, fileId: string, filepath: string, params: ResolveFileParams): ActionState {
    const downloadState = new ActionState(ActionTypes.Download);

    if (!this.config.encryptionKey) {
      params.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!bucketId) {
      params.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!fileId) {
      params.finishedCallback(Error('File id not provided'), null);

      return downloadState;
    }

    if (params.debug) {
      this.logger = Logger.getDebugger(this.config.logLevel || 1, params.debug);
    }

    download(this.config, bucketId, fileId, params.progressCallback, this.logger, downloadState)
      .then((fileStream) => {
        fileStream.pipe(createWriteStream(filepath))
          .on('error', (err) => {
            params.finishedCallback(err, null);
          })
          .on('finish', () => {
            this.logger.info('Download success!');

            params.finishedCallback(null, null);
          });
      }).catch((err) => {
        params.finishedCallback(err, null);
      });

    return downloadState;
  }

  /**
   * Cancels the download
   * @param state Download file state at the moment
   */
  resolveFileCancel(state: ActionState): void {
    state.stop();
  }

}

export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  webProxy?: string;
  config?: {
    shardRetry: number,
    maxConcurrency: number
  };
}
