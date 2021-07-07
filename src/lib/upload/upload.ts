import { utils } from "rs-wrapper";

import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import { ShardMeta } from '../shardMeta';
import { CreateEntryFromFrameBody } from '../../services/request';
import { logger } from "../utils/logger";
import { promisifyStream } from "../utils/promisify";

const MIN_SHARD_SIZE = 2097152; // 2Mb

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

    await file.init();
    await file.checkBucketExistence();
    await file.stage();
    const out = file.encrypt();

    // TODO: Is this useful?
    progress(0, 0, file.getSize());

    let shardIndex = 0;
    const uploadRequests: Promise<ShardMeta>[] = [];

    out.on('data', (shard: Buffer) => {
        uploadRequests.push(file.UploadShard(shard, shard.length, file.frameId, shardIndex++, 3, false));
    });

    try {
        await promisifyStream(out);

        const fileSize = file.getSize();

        logger.debug('Shards obtained %s, shardSize %s', Math.ceil(fileSize / utils.determineShardSize(fileSize)), utils.determineShardSize(fileSize));
        logger.debug('Waiting for upload to progress');

        let currentBytesUploaded = 0;
        const uploadResponses = await Promise.all(
            uploadRequests.map(async (request) => {
                const shardMeta = await request;

                currentBytesUploaded = updateProgress(fileSize, currentBytesUploaded, shardMeta.size, progress);

                return shardMeta;
            })
        ).catch((err) => {
            // TODO: Give more error granularity
            throw new Error('Farmer request error');
        });

        logger.debug('Upload finished');

        const savingFileResponse = await createBucketEntry(file, fileMeta, uploadResponses, false);

        if (!savingFileResponse) {
            throw new Error('Can not save the file in network');
        }

        progress(100, fileSize, fileSize);
        finish(null, savingFileResponse);

        logger.info('File uploaded with id %s', savingFileResponse.id);

    } catch (err) {
        finish(err, null);
    }
}

export function createBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean) {
    return fileObject.SaveFileInNetwork(generateBucketEntry(fileObject, fileMeta, shardMetas, rs));
}

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

function updateProgress(totalBytes: number, currentBytesUploaded: number, newBytesUploaded: number, progress: UploadProgressCallback): number {
    const newCurrentBytes = currentBytesUploaded + newBytesUploaded;
    const progressCounter = Math.ceil((newCurrentBytes / totalBytes) * 100);
    progress(progressCounter, newCurrentBytes, totalBytes);

    return newCurrentBytes;
}