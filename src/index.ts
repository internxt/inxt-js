import * as Winston from 'winston';
import { request } from '@internxt/lib';

import {
  upload,
  UploadStrategyFunction,
  UploadStrategy,
  UploadOptions,
  UploadStrategyObject,
  UploadOneStreamStrategy,
  download,
  DownloadStrategyFunction,
  DownloadStrategy,
  DownloadOptions,
  DownloadStrategyObject,
  UploadOneShardStrategy,
  DownloadDynamicStrategy,
  DownloadOneShardStrategy,
} from './lib/core';

import { EncryptFilename, GenerateFileKey } from './lib/utils/crypto';

// TODO: Remove this
import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes, Bucket, EnvironmentConfig } from './api';
import { logger, Logger } from './lib/utils/logger';

import { FileInfo, GetFileInfo } from './api/fileinfo';
import { Bridge, CreateFileTokenResponse, GetDownloadLinksResponse } from './services/api';
import { HashStream } from './lib/utils/streams';
import { downloadFileV2 } from './lib/core/download/downloadV2';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';

type GetBucketsCallback = (err: Error | null, result: any) => void;

type GetBucketIdCallback = (err: Error | null, result: any) => void;

type DeleteBucketCallback = (err: Error | null, result: any) => void;

type ListFilesCallback = (err: Error | null, result: any) => void;

type DeleteFileCallback = (err: Error | null, result: any) => void;

const utils = {
  generateFileKey: GenerateFileKey,
  Hasher: HashStream,
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

  static getFileInfo(bridgeUrl: string, bucketId: string, fileId: string, token: string): Promise<FileInfo> {
    return GetFileInfo({ bridgeUrl, bridgePass: '', bridgeUser: '' }, bucketId, fileId, token);
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
   * @returns Bucket id
   */
  createBucket(bucketName: string): Promise<string> {
    return new Bridge(this.config)
      .createBucket(bucketName)
      .start<Bucket>()
      .then((bucket) => {
        return bucket.id;
      })
      .catch((err) => {
        throw new Error(request.extractMessageFromError(err));
      });
  }

  /**
   * Creates file token
   * @param bucketId Bucket id where file is stored
   * @param fileId File id
   * @param operation
   * @param cb
   */
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): Promise<string> {
    return new Bridge(this.config)
      .createFileToken(bucketId, fileId, operation)
      .start<CreateFileTokenResponse>()
      .then((res) => {
        return res.token;
      });
  }

  /**
   * Deletes a bucket
   * @param bucketId Id whose bucket is going to be deleted
   * @param cb Callback that will receive the response after deletion
   */
  deleteBucket(bucketId: string): Promise<void> {
    return new Bridge(this.config)
      .deleteBucket(bucketId)
      .start<void>()
      .catch((err) => {
        throw new Error(request.extractMessageFromError(err));
      });
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

  upload: UploadStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: UploadStrategyObject) => {
    const uploadState = new ActionState(ActionTypes.Upload);

    if (!this.config.encryptionKey) {
      opts.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!bucketId) {
      opts.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    EncryptFilename(this.config.encryptionKey, bucketId, opts.name)
      .then((encryptedFilename) => {
        logger.debug('Filename %s encrypted is %s', opts.name, encryptedFilename);

        logger.debug('Using %s strategy', strategyObj.label);

        let strategy: UploadStrategy | null = null;

        if (strategyObj.label === 'OneStreamOnly') {
          strategy = new UploadOneStreamStrategy(strategyObj.params);
        }

        if (strategyObj.label === 'OneShardOnly') {
          strategy = new UploadOneShardStrategy(strategyObj.params);
        }

        if (!strategy) {
          return opts.finishedCallback(Error('Unknown strategy'), null);
        }

        return upload(this.config, encryptedFilename, bucketId, opts, uploadState, strategy).then((fileId) => {
          opts.finishedCallback(null, fileId);
        });
      })
      .catch((err) => {
        if (err && err.message && err.message.includes('Upload aborted')) {
          return opts.finishedCallback(new Error('Process killed by user'), null);
        }
        opts.finishedCallback(err, null);
      });

    return uploadState;
  };

  download: DownloadStrategyFunction<any> = (
    bucketId: string,
    fileId: string,
    opts: DownloadOptions,
    strategyObj: DownloadStrategyObject<any>,
  ) => {
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

    if (!this.config.bridgeUrl) {
      opts.finishedCallback(Error('Missing bridge url'), null);

      return downloadState;
    }

    const [downloadPromise, stream] = downloadFileV2(
      fileId, 
      bucketId, 
      this.config.encryptionKey, 
      this.config.bridgeUrl,
      {
        user: this.config.bridgeUser,
        pass: this.config.bridgePass
      },
      opts.progressCallback,
      downloadState,
      () => {
        opts.finishedCallback(null, stream);
      }
    );

    downloadPromise.catch((err) => {
      if (err instanceof FileVersionOneError) {
        let strategy: DownloadStrategy | null = null;

        if (strategyObj.label === 'Dynamic') {
          strategy = new DownloadDynamicStrategy(strategyObj.params);
        }

        if (!strategy) {
          opts.finishedCallback(Error('Unknown strategy'), null);

          return downloadState;
        }

        download(this.config, bucketId, fileId, opts, downloadState, strategy)
          .then((res) => {
            opts.finishedCallback(null, res);
          })
          .catch((downloadErr) => {
            opts.finishedCallback(downloadErr, null);
          });
      } else {
        opts.finishedCallback(err, null);
      }
    });

    return downloadState;
  };

  downloadCancel(state: ActionState): void {
    state.stop();
  }

  uploadCancel(state: ActionState): void {
    state.stop();
  }

  renameFile(bucketId: string, fileId: string, newPlainName: string): Promise<void> {
    const mnemonic: string | undefined = this.config.encryptionKey;

    if (!mnemonic) {
      throw new Error(ENCRYPTION_KEY_NOT_PROVIDED);
    }

    return EncryptFilename(mnemonic, bucketId, newPlainName).then((newEncryptedName) => {
      return new Bridge(this.config).renameFile(bucketId, fileId, newEncryptedName).start();
    });
  }

  getDownloadLinks(bucketId: string, fileIds: string[]) {
    return new Bridge(this.config).getDownloadLinks(bucketId, fileIds).start<GetDownloadLinksResponse>();
  }
}
