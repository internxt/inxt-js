import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import { ShardMeta } from '../shardMeta';
import { CreateEntryFromFrameBody } from '../../services/request';
import { logger } from "../utils/logger";

/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export async function Upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, progress: UploadProgressCallback, finish: UploadFinishCallback): Promise<void> {
    if (!config.encryptionKey) {
        throw new Error('Encryption key is null');
    }

    const file = new FileObjectUpload(config, fileMeta, bucketId);

    try {
        await file.init();
        await file.checkBucketExistence();
        await file.stage();
        file.encrypt();

        // TODO: Is this useful?
        progress(0, 0, file.getSize());

        const uploadResponses = await file.upload(progress);

        logger.debug('Upload finished');

        const savingFileResponse = await createBucketEntry(file, fileMeta, uploadResponses, false);

        if (!savingFileResponse) {
            throw new Error('Can not save the file in network');
        }

        progress(100, file.getSize(), file.getSize());
        // TODO: Return just the fileId
        finish(null, savingFileResponse);

        logger.info('File uploaded with id %s', savingFileResponse.id);
    } catch (err) {
        finish(err, null);
    }
}


// TODO: Move to FileObjectUpload
export function createBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean) {
    return fileObject.SaveFileInNetwork(generateBucketEntry(fileObject, fileMeta, shardMetas, rs));
}

// TODO: Move to FileObjectUpload
export function generateBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): CreateEntryFromFrameBody {
    const bucketEntry: CreateEntryFromFrameBody = {
        frame: fileObject.frameId,
        filename: fileMeta.name,
        index: fileObject.index.toString('hex'),
        hmac: {
            type: 'sha512',
            value: fileObject.GenerateHmac(shardMetas)
        }
    };

    if (rs) {
        bucketEntry.erasure = { type: "reedsolomon" };
    }

    return bucketEntry;
}