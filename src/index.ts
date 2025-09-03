import { request } from '@internxt/lib';
import {
  UploadStrategyFunction,
  UploadOptions,
  download,
  DownloadStrategyFunction,
  DownloadStrategy,
  DownloadOptions,
  DownloadStrategyObject,
  DownloadDynamicStrategy,
  Events,
} from './lib/core';

import { EncryptFilename, GenerateFileKey } from './lib/utils/crypto';

// TODO: Remove this
import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes, Bucket, EnvironmentConfig } from './api';

import { FileInfo, GetFileInfo } from './api/fileinfo';
import { Bridge, CreateFileTokenResponse, GetDownloadLinksResponse } from './services/api';
import { HashStream } from './lib/utils/streams';
import { downloadFileV2 } from './lib/core/download/downloadV2';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import { uploadFileMultipart, uploadFileV2 } from './lib/core/upload/uploadV2';

type GetBucketsCallback = (err: Error | null, result: any) => void;

type GetBucketIdCallback = (err: Error | null, result: any) => void;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DeleteBucketCallback = (err: Error | null, result: any) => void;

type ListFilesCallback = (err: Error | null, result: any) => void;

type DeleteFileCallback = (err: Error | null, result: any) => void;

const utils = {
  generateFileKey: GenerateFileKey,
  Hasher: HashStream,
};

export class Environment {
  config: EnvironmentConfig;

  static utils = utils;

  constructor(config: EnvironmentConfig) {
    this.config = config;
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

  uploadMultipartFile(bucketId: string, opts: UploadOptions): ActionState {
    const uploadState = new ActionState(ActionTypes.Upload);

    if (!this.config.encryptionKey) {
      opts.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!this.config.bridgeUrl) {
      opts.finishedCallback(Error('Missing param "bridgeUrl"'), null);
      
      return uploadState;
    }

    if (!bucketId) {
      opts.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    // if (!opts.parts || isNaN(opts.parts) || opts.parts < 2) {
    //   opts.finishedCallback(Error('Invalid "parts" parameter. Expected number > 1'), null);

    //   return uploadState;
    // }

    uploadFileMultipart(
      opts.fileSize,
      opts.source,
      bucketId,
      this.config.encryptionKey,
      this.config.bridgeUrl,
      {
        user: this.config.bridgeUser,
        pass: this.config.bridgePass
      },
      opts.progressCallback,
      uploadState,
      this.config.appDetails,
    ).then((fileId) => {
      opts.finishedCallback(null, fileId);
    }).catch((err) => {
      opts.finishedCallback(
        err.message === 'The operation was aborted' ? 
          new Error('Process killed by user') : 
          err, 
        null);
    });

    return uploadState;
  }

  upload: UploadStrategyFunction = (bucketId: string, opts: UploadOptions) => {
    const uploadState = new ActionState(ActionTypes.Upload);

    if (!this.config.encryptionKey) {
      opts.finishedCallback(Error('Mnemonic was not provided, please, provide a mnemonic'), null);

      return uploadState;
    }

    if (!this.config.bridgeUrl) {
      opts.finishedCallback(Error('Missing param "bridgeUrl"'), null);
      
      return uploadState;
    }

    if (!bucketId) {
      opts.finishedCallback(Error('Bucket id was not provided'), null);

      return uploadState;
    }

    uploadFileV2(
      opts.fileSize,
      opts.source,
      bucketId,
      this.config.encryptionKey,
      this.config.bridgeUrl,
      {
        user: this.config.bridgeUser,
        pass: this.config.bridgePass
      },
      this.config.appDetails,
      opts.progressCallback,
      uploadState
    ).then((fileId) => {
      opts.finishedCallback(null, fileId);
    }).catch((err) => {
      opts.finishedCallback(
        err.message === 'The operation was aborted' ? 
          new Error('Process killed by user') : 
          err, 
        null);
    });

    return uploadState;
  };

  download: DownloadStrategyFunction<any> = (
    bucketId: string,
    fileId: string,
    opts: DownloadOptions,
    strategyObj: DownloadStrategyObject<any>,
  ) => {
    const abortController = new AbortController();
    const downloadState = new ActionState(ActionTypes.Download);

    downloadState.once(Events.Download.Abort, () => {
      abortController.abort();
    });

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
      this.config.appDetails,
      opts.progressCallback,
      () => {
        opts.finishedCallback(null, stream);
      },
      abortController,
      strategyObj.params.chunkSize,
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
