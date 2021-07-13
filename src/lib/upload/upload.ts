import * as Winston from 'winston';

import { EnvironmentConfig, UploadFileOptions } from "../..";
import { ActionState } from "../../api/ActionState";
import { UPLOAD_CANCELLED } from "../../api/constants";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";

/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export async function upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, params: UploadFileOptions, logger: Winston.Logger, actionState: ActionState): Promise<void> {
    let file: FileObjectUpload;

    try {
        file = new FileObjectUpload(config, fileMeta, bucketId, logger);
        actionState.on(UPLOAD_CANCELLED, () => { file.emit(UPLOAD_CANCELLED); });

        await file.init();
        await file.checkBucketExistence();
        await file.stage();
        file.encrypt();

        const uploadResponses = await file.upload(params.progressCallback);

        logger.debug('Upload finished. Creating bucket entry...');

        await file.createBucketEntry(uploadResponses);

        params.progressCallback(1, file.getSize(), file.getSize());

        params.finishedCallback(null, file.getId());
    } catch (err) {
        if (file! && file!.isAborted()) {
            return params.finishedCallback(new Error('Process killed by user'), null);
        }
        params.finishedCallback(err, null);
    }
}
