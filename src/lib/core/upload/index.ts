import { ActionState, EnvironmentConfig, FileObjectUpload } from '../../../api';
import { UploadStrategy } from './strategy';
import { Events } from '../';

export * from './strategy';
export * from './oneStreamStrategy';
export * from './oneShardStrategy';

export type UploadProgressCallback = (
  progress: number,
  uploadedBytes: number | null,
  totalBytes: number | null,
) => void;
export type EncryptProgressCallback = (progress: number) => void;
export type UploadFinishCallback = (err: Error | null, response: string | null) => void;

export interface UploadOptions {
  progressCallback: UploadProgressCallback;
  finishedCallback: UploadFinishCallback;
  encryptProgressCallback?: EncryptProgressCallback;
  /**
   * Name of the content uploaded to the network. This name SHOULD be encrypted
   */
  name: string;
}

type FileId = string;

/**
 * Upload entry point
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 *
 * @returns {FileId} The id of the created file
 */
export async function upload(
  config: EnvironmentConfig,
  filename: string,
  bucketId: string,
  params: UploadOptions,
  state: ActionState,
  uploader: UploadStrategy,
): Promise<FileId> {
  const file = new FileObjectUpload(config, filename, bucketId, uploader);

  state.once(Events.Upload.Abort, () => {
    file.emit(Events.Upload.Abort);
    state.removeAllListeners();
  });

  file.on(Events.Upload.Progress, (progress) => {
    params.progressCallback(progress, 0, 0);
  });

  if (params.encryptProgressCallback) {
    file.on(Events.Upload.EncryptProgress, params.encryptProgressCallback);
  }

  return file
    .init()
    .then(() => file.checkBucketExistence())
    .then(() => file.stage())
    .then(() => file.upload())
    .then((shardMetas) => file.createBucketEntry(shardMetas))
    .then(() => file.getId());
}
