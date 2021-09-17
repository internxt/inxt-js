import blobToStream from 'blob-to-stream';
import { Readable } from 'stream';
import { createWriteStream, statSync } from 'fs';
import * as Winston from 'winston';

import { OneStreamStrategy, upload, UploadFunction, UploadStrategyObject, uploadV2 } from './lib/upload';
import { download } from './lib/download';
import { EncryptFilename, GenerateFileKey } from './lib/crypto';

import { BUCKET_ID_NOT_PROVIDED, DOWNLOAD_CANCELLED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes } from './api/ActionState';
import { adapt as webAdapter, WebDownloadFileOptions } from './api/adapters/Web';
import { logger, Logger } from './lib/utils/logger';
import { basename } from 'path';
import streamToBlob from 'stream-to-blob';
import { FileInfo, GetFileInfo } from './api/fileinfo';
import { Bridge, CreateFileTokenResponse } from './services/api';
import { StreamFileSystemStrategy } from './lib/upload';
import { UploadStrategy } from './lib/upload/UploadStrategy';
import { EmptyStrategy } from './lib/upload/EmptyStrategy';
import { HashStream } from './lib/hasher';

export type OnlyErrorCallback = (err: Error | null) => void;

export type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null)  => void;
export type UploadFinishCallback = (err: Error | null, response: string | null) => void;

export type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;

export type DecryptionProgressCallback = (progress: number, decryptedBytes: number | null, totalBytes: number | null) => void;

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
  fileToken?: string;
  fileEncryptionKey?: Buffer;
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
  filename?: string;
}

interface ResolveFileParams extends DownloadFileOptions {
  debug?: DebugCallback;
}

interface UploadOptions extends UploadFileOptions {
  filename: string;
}

const utils = {
  generateFileKey: GenerateFileKey,
  Hasher: HashStream
};

export class Environment {
  config: EnvironmentConfig;
  logger: Winston.Logger;

  static utils = utils;

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
   * Gets file info
   * @param bucketId Bucket id where file is stored
   * @param fileId 
   * @returns file info
   */
  getFileInfo(bucketId: string, fileId: string): Promise<FileInfo> {
    return GetFileInfo(this.config, bucketId, fileId);
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
   * Creates file token
   * @param bucketId Bucket id where file is stored
   * @param fileId File id
   * @param operation 
   * @param cb 
   */
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): Promise<string> {
    return new Bridge(this.config).createFileToken(bucketId, fileId, operation).start<CreateFileTokenResponse>()
      .then((res) => {
        return res.token;
      });
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

    if (!options.fileEncryptionKey && !this.config.encryptionKey) {
      options.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!bucketId) {
      options.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED), null);

      return downloadState;
    }

    download(this.config, bucketId, fileId, webAdapter(options), this.logger, downloadState)
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
  uploadFile(bucketId: string, params: UploadFileParams): ActionState {
    const uploadState = new ActionState(ActionTypes.Upload);

    const { filename, fileSize: size, fileContent } = params;

    if (!filename) {
      params.finishedCallback(Error('Filename was not provided'), null);

      return uploadState;
    }

    if (fileContent.size === 0) {
      params.finishedCallback(Error('Can not upload a file with size 0'), null);

      return uploadState;
    }

    const file = { content:blobToStream(fileContent) , plainName: filename, size };

    return this.uploadStream(bucketId, file, params, uploadState);
  }

  /**
   * Uploads a file from file system
   * @param bucketId Bucket id where file is going to be stored
   * @param params Store file params
   */
  storeFile(bucketId: string, filepath: string, params: StoreFileParams): ActionState {
    const desiredRamUsage = this.config.config?.ramUsage ?? 1024 * 1024 * 200; // 200Mb

    const uploadState = new ActionState(ActionTypes.Upload);
    const uploadStrategy = new StreamFileSystemStrategy({ desiredRamUsage, filepath }, logger);
    const fileStat = statSync(filepath);

    if (!this.config.encryptionKey) {
      params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!bucketId) {
      params.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    if (fileStat.size === 0) {
      params.finishedCallback(Error('Can not upload a file with size 0'), null);

      return uploadState;
    }

    if (params.debug) {
      this.logger = Logger.getDebugger(this.config.logLevel || 1, params.debug);
    }

    const filename = params.filename || basename(filepath);

    EncryptFilename(this.config.encryptionKey, bucketId, filename)
      .then((encryptedName: string) => {
        logger.debug('Filename %s encrypted is %s', filename, encryptedName);

        const fileMeta = { content: Readable.from(''), size: fileStat.size, name: encryptedName };

        return uploadV2(this.config, fileMeta, bucketId, params, this.logger, uploadState, uploadStrategy);
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

  upload: UploadFunction = (bucketId: string, opts: UploadOptions, strategyObj: UploadStrategyObject) => {
    const uploadState = new ActionState(ActionTypes.Upload);

    if (!this.config.encryptionKey) {
      opts.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!bucketId) {
      opts.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    EncryptFilename(this.config.encryptionKey, bucketId, opts.filename).then((encryptedFilename) => {
      logger.debug('Filename %s encrypted is %s', opts.filename, encryptedFilename);

      const fileMeta = { content: Readable.from(''), size: 0, name: encryptedFilename };

      logger.debug('Using %s strategy', strategyObj.label);

      let strategy: UploadStrategy = new EmptyStrategy();

      if (strategyObj.label === 'OneStreamOnly') {
        strategy = new OneStreamStrategy(strategyObj.params);
      }

      if (strategyObj.label === 'MultipleStreams') {
        strategy = new StreamFileSystemStrategy(strategyObj.params, logger);
      }

      if (strategy instanceof EmptyStrategy) {
        return opts.finishedCallback(new Error('Unknown upload strategy'), null);
      }

      return uploadV2(this.config, fileMeta, bucketId, opts, logger, uploadState, strategy);
    }).catch((err) => {
      if (err && err.message && err.message.includes('Upload aborted')) {
        return opts.finishedCallback(new Error('Process killed by user'), null);
      }
      opts.finishedCallback(err, null);
    });

    return uploadState;
  }

  uploadCancel(state: ActionState): void {
    state.stop();
  }

  /**
   * Uploads a file from a stream
   * @param bucketId Bucket id where file is going to be stored
   * @param params Store file params
   */
  uploadStream(bucketId: string, file: {content:Readable, size:number, plainName:string}, params: UploadFileOptions, givenUploadState?: ActionState): ActionState {
    const uploadState = givenUploadState ?? new ActionState(ActionTypes.Upload);

    if (!this.config.encryptionKey) {
      params.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!bucketId) {
      params.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    EncryptFilename(this.config.encryptionKey, bucketId, file.plainName)
      .then((encryptedName: string) => {
        logger.debug('Filename %s encrypted is %s', file.plainName, encryptedName);

        const {content, size} = file

        const fileMeta = {content, size, name: encryptedName}

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

    const destination = createWriteStream(filepath);

    downloadState.once(DOWNLOAD_CANCELLED, () => {
      destination.emit('error', new Error('Process killed by user'));
    });

    destination.once('error', (err) => {
      destination.destroy();
      params.finishedCallback(err, null);
    });

    destination.once('finish', () => {
      destination.destroy();
      params.finishedCallback(null, null);
    });

    download(this.config, bucketId, fileId, params, this.logger, downloadState)
      .then((fileStream) => {
        fileStream.on('error', (err) => destination.emit('error', err));
        fileStream.pipe(destination);
      }).catch((err) => {
        destination.destroy();
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
  useProxy?: boolean;
  config?: {
    shardRetry: number,
    ramUsage: number
  };
  inject?: {
    fileEncryptionKey?: Buffer,
    index?: Buffer;
  }
}
