import * as Winston from 'winston';

import { EnvironmentConfig, UploadFileOptions } from "../..";
import { logger } from '../utils/logger';
import { UploadEvents, UploadStrategy } from './UploadStrategy';
import { ActionState, Events, FileMeta, FileObjectUpload } from '../../api';

/**
 * Upload entry point
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export async function upload(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, params: UploadFileOptions, debug: Winston.Logger, actionState: ActionState, uploader: UploadStrategy): Promise<void> {
  const file = new FileObjectUpload(config, fileMeta, bucketId, debug, uploader);

  actionState.once(Events.Upload.Abort, () => {
    file.emit(Events.Upload.Abort);
    actionState.removeAllListeners();
  });

  file.on(UploadEvents.Progress, (progress) => {
    params.progressCallback(progress, 0, 0);
  });

  await file.init();
  await file.checkBucketExistence();
  await file.stage();

  const shardMetas = await file.upload();

  logger.debug('Upload finished. Creating bucket entry...');

  await file.createBucketEntry(shardMetas);

  logger.info('Uploaded file with id %s', file.getId());

  params.progressCallback(1, file.getSize(), file.getSize());
  params.finishedCallback(null, file.getId());
}
