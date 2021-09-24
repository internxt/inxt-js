import * as Winston from 'winston';

import { EnvironmentConfig, UploadFileOptions } from "../..";
import { ActionState } from "../../api/ActionState";
import { UPLOAD_CANCELLED } from "../../api/constants";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import { FileObjectUploadV2 } from '../../api/FileObjectUploadV2';
import { logger } from '../utils/logger';
import { UploadEvents, UploadStrategy } from './UploadStrategy';

import { Events } from '../../api/events';

/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export async function upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, params: UploadFileOptions, debug: Winston.Logger, actionState: ActionState): Promise<void> {
    const file = new FileObjectUpload(config, fileMeta, bucketId, debug);

    actionState.on(UPLOAD_CANCELLED, () => {
        file.emit(UPLOAD_CANCELLED);
    });

    await file.init();
    await file.checkBucketExistence();
    await file.stage();
    file.encrypt();

    const uploadResponses = await file.upload(params.progressCallback);

    logger.debug('Upload finished. Creating bucket entry...');

    await file.createBucketEntry(uploadResponses);

    logger.info('Uploaded file with id %s', file.getId());

    params.progressCallback(1, file.getSize(), file.getSize());
    params.finishedCallback(null, file.getId());
}

export async function uploadV2(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, params: UploadFileOptions, debug: Winston.Logger, actionState: ActionState, uploader: UploadStrategy): Promise<void> {
  // const file = new FileObjectUploadV2(config, fileMeta, bucketId, debug, uploader);
  const file = new FileObjectUploadV2();

  // actionState.once(Events.Upload.Abort, () => {
  //   file.emit(Events.Upload.Abort);
  //   actionState.removeAllListeners();
  // });

  // file.on(UploadEvents.Progress, (progress) => {
  //   params.progressCallback(progress, 0, 0);
  // });

  // await file.init();
  // await file.checkBucketExistence();
  await file.stage();

  const uploadResponses = await file.upload(params.progressCallback);

  logger.debug('Upload finished. Creating bucket entry...');

  // await file.createBucketEntry(uploadResponses);

  // logger.info('Uploaded file with id %s', file.getId());

  // params.progressCallback(1, file.getSize(), file.getSize());
  // params.finishedCallback(null, file.getId());
}