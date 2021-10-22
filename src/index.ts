import { Readable } from 'stream';
import * as Winston from 'winston';

import { OneStreamStrategy, OneStreamStrategyObject, upload } from './lib/upload';
import {
  download,
  DownloadFunction,
  DownloadStrategyObject,
  OneStreamStrategy as DownloadOneStreamStrategy
} from './lib/download';
import { EncryptFilename, GenerateFileKey } from './lib/crypto';

import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes } from './api/ActionState';
import { logger, Logger } from './lib/utils/logger';

import { FileInfo, GetFileInfo } from './api/fileinfo';
import { Bridge, CreateFileTokenResponse } from './services/api';
import { UploadStrategy } from './lib/upload/UploadStrategy';
import { EmptyStrategy } from './lib/upload/EmptyStrategy';
import { HashStream } from './lib/hasher';
import { DownloadStrategy } from './lib/download/DownloadStrategy';

export type UploadStrategyObject = OneStreamStrategyObject;

export type OneStreamOnlyStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: OneStreamStrategyObject) => ActionState;
export type UploadFunction = OneStreamOnlyStrategyFunction;

export type OnlyErrorCallback = (err: Error | null) => void;

export type UploadProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
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

export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  webProxy?: string;
  useProxy?: boolean;
  download?: {
    concurrency: number;
  }
  inject?: {
    fileEncryptionKey?: Buffer,
    index?: Buffer;
  }
  upload?: {
    concurrency: number;
  }
}


type GetBucketsCallback = (err: Error | null, result: any) => void;

type GetBucketIdCallback = (err: Error | null, result: any) => void;

type CreateBucketCallback = (err: Error | null, result: any) => void;

type DeleteBucketCallback = (err: Error | null, result: any) => void;

type ListFilesCallback = (err: Error | null, result: any) => void;

type DeleteFileCallback = (err: Error | null, result: any) => void;

type DebugCallback = (message: string) => void;

interface UploadOptions extends UploadFileOptions {
  filename: string;
}

export interface DownloadOptions extends DownloadFileOptions {
  debug?: DebugCallback;
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

      if (strategy instanceof EmptyStrategy) {
        return opts.finishedCallback(new Error('Unknown upload strategy'), null);
      }

      return upload(this.config, fileMeta, bucketId, opts, logger, uploadState, strategy);
    }).catch((err) => {
      if (err && err.message && err.message.includes('Upload aborted')) {
        return opts.finishedCallback(new Error('Process killed by user'), null);
      }
      opts.finishedCallback(err, null);
    });

    return uploadState;
  }

  download: DownloadFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: DownloadStrategyObject) => {
    const downloadState = new ActionState(ActionTypes.Download);

    if (!this.config.encryptionKey) {
      opts.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!bucketId) {
      opts.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED), null);

      return downloadState;
    }

    if (!fileId) {
      opts.finishedCallback(Error('File id not provided'), null);

      return downloadState;
    }

    if (opts.debug) {
      this.logger = Logger.getDebugger(this.config.logLevel || 1, opts.debug);
    }

    const strategy: DownloadStrategy = new DownloadOneStreamStrategy(this.config, this.logger);

    download(this.config, bucketId, fileId, opts, this.logger, downloadState, strategy).then((res) => {
      opts.finishedCallback(null, res);
    }).catch((err) => {
      opts.finishedCallback(err, null);
    });

    return downloadState;
  }

  downloadCancel(state: ActionState): void {
    state.stop();
  }

  uploadCancel(state: ActionState): void {
    state.stop();
  }

  async renameFile(bucketId: string, fileId: string, newPlainName: string): Promise<void> {
    const mnemonic: string | undefined = this.config.encryptionKey;

    if (!mnemonic) {
      throw new Error(ENCRYPTION_KEY_NOT_PROVIDED);
    }

    return EncryptFilename(mnemonic, bucketId, newPlainName).then((newEncryptedName) => {
      return new Bridge(this.config).renameFile(bucketId, fileId, newEncryptedName).start();
    }).then(() => { });
  }

  /**
   * Cancels a file upload
   * @param {ActionState} state Upload state
   */
  storeFileCancel(state: ActionState): void {
    state.stop();
  }
}
