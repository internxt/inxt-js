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

// TODO: Remove this
import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes, EnvironmentConfig } from './api';

import { FileInfo, GetFileInfo } from './api/fileinfo';
import { Bridge, CreateFileTokenResponse, GetDownloadLinksResponse } from './services/api';
import { downloadFileV2 } from './lib/core/download/downloadV2';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import { upload as uploadFileV2 } from './lib/core/upload/uploadV2';

export class Environment {
  config: EnvironmentConfig;

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

  upload: UploadStrategyFunction = async (bucketId: string, opts: UploadOptions) => {
    if (!this.config.encryptionKey) {
      throw Error('Mnemonic was not provided, please, provide a mnemonic');
    }

    if (!this.config.bridgeUrl) {
      throw Error('Missing param "bridgeUrl"');
    }

    if (!bucketId) {
      throw Error('Bucket id was not provided');
    }

    return await uploadFileV2(
      opts.fileSize,
      opts.source,
      bucketId,
      this.config.encryptionKey,
      this.config.bridgeUrl,
      {
        user: this.config.bridgeUser,
        pass: this.config.bridgePass,
      },
      this.config.appDetails,
      opts.progressCallback,
      opts.abortSignal,
    );
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
        pass: this.config.bridgePass,
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

  getDownloadLinks(bucketId: string, fileIds: string[]) {
    return new Bridge(this.config).getDownloadLinks(bucketId, fileIds).start<GetDownloadLinksResponse>();
  }
}
