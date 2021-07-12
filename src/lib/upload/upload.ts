import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { ActionState } from "../../api/ActionState";
import { UPLOAD_CANCELLED } from "../../api/constants";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import { logger } from "../utils/logger";

/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export async function upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, progress: UploadProgressCallback, finish: UploadFinishCallback, actionState: ActionState): Promise<void> {
    const file = new FileObjectUpload(config, fileMeta, bucketId);

    actionState.on(UPLOAD_CANCELLED, () => { file.emit(UPLOAD_CANCELLED); });

    try {
        await file.init();
        await file.checkBucketExistence();
        await file.stage();
        file.encrypt();

        const uploadResponses = await file.upload(progress);

        logger.debug('Upload finished. Creating bucket entry...');

        await file.createBucketEntry(uploadResponses);

        progress(1, file.getSize(), file.getSize());

        finish(null, file.getId());
    } catch (err) {
        if (file.isAborted()) {
            return finish(new Error('Process killed by user'), null);
        }
        finish(err, null);
    }
}