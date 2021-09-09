import * as Winston from 'winston';

import { EnvironmentConfig, UploadFileOptions } from "../..";
import { ActionState } from "../../api/ActionState";
import { UPLOAD_CANCELLED } from "../../api/constants";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import { FileObjectUploadStreams } from '../../api/FileObjectUploadStreams';
import { logger } from '../utils/logger';
import { UploadStrategy } from './UploadStrategy';

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
  const file = new FileObjectUploadStreams(config, fileMeta, bucketId, debug, uploader);

  actionState.on(UPLOAD_CANCELLED, () => {
    file.emit(UPLOAD_CANCELLED);
  });

  await file.init();
  await file.checkBucketExistence();
  await file.stage();

  const uploadResponses = await file.upload(params.progressCallback);

  logger.debug('Upload finished. Creating bucket entry...');

  await file.createBucketEntry(uploadResponses);

  logger.info('Uploaded file with id %s', file.getId());

  params.progressCallback(1, file.getSize(), file.getSize());
  params.finishedCallback(null, file.getId());
}