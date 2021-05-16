import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import EncryptStream from "../encryptStream";
import { ShardMeta } from '../shardMeta';
import * as api from '../../services/request';
import { logger } from "../utils/logger";

import { encode, utils } from "rs-wrapper";

const MIN_SHARD_SIZE = 2097152; // 2Mb

/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export function Upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, progress: UploadProgressCallback, finish: UploadFinishCallback): void {
    if (!config.encryptionKey) {
        throw new Error('Encryption key is null');
    }

    const File = new FileObjectUpload(config, fileMeta, bucketId);

    let fileContent: Buffer = Buffer.alloc(0);

    File.init().then(() => File.StartUploadFile()).then((out: EncryptStream) => {
        return new Promise((resolve, reject) => {
            const totalBytes = fileMeta.size;

            let currentBytesUploaded = 0;

            const uploadShardPromises: Promise<ShardMeta>[] = [];

            progress(0, 0, totalBytes);

            out.on('data', async (shard: Buffer) => {
                fileContent = Buffer.concat([fileContent, shard]);
            });

            out.on('error', reject);

            out.on('end', async () => {
                const fileSize = fileContent.length;
                const shardSize = utils.determineShardSize(fileSize);
                const nShards = Math.ceil(fileSize / shardSize);
                const parityShards = utils.determineParityShards(nShards);

                const rs = fileSize >= MIN_SHARD_SIZE;
                const totalSize = rs ? fileSize + (parityShards * shardSize) : fileSize;

                const action: UploadShardsAction = {
                    fileContent, nShards, shardSize, fileObject: File, firstIndex: 0, parity: false
                }

                console.log('Shards obtained %s, shardSize %s', nShards, shardSize);

                let shardUploadRequests = uploadShards(action);
                let paritiesUploadRequests: Promise<ShardMeta>[] = [];

                if (rs) {
                    console.log({ shardSize, nShards, parityShards, fileContentSize: fileContent.length });
                    console.log("Applying Reed Solomon. File size %s. Creating %s parities", fileContent.length, parityShards);

                    const parities = await getParities(fileContent, shardSize, nShards, parityShards);

                    console.log("Parities content size", parities.length);

                    action.fileContent = Buffer.from(parities);
                    action.firstIndex = shardUploadRequests.length;
                    action.parity = true;
                    action.nShards = parityShards;

                    // upload parities
                    paritiesUploadRequests = uploadShards(action);
                } else {
                    console.log('File too small (%s), not creating parities', fileSize);
                }

                try {
                    console.log('Waiting for upload to progress');
                    const uploadResponses = await Promise.all(shardUploadRequests.concat(paritiesUploadRequests));
                    console.log('Upload finished');

                    // TODO: Check message and way of handling
                    if (uploadResponses.length === 0) { 
                        throw new Error('no upload requests has been made'); 
                    }

                    const savingFileResponse = await createBucketEntry(File, fileMeta, uploadResponses, rs);

                    // TODO: Change message and way of handling
                    if (!savingFileResponse) { 
                        throw new Error('Can not save the file in network'); 
                    }

                    progress(100, totalBytes, totalBytes);
                    finish(null, savingFileResponse);

                    console.log('All shards uploaded, check it mf: %s', savingFileResponse.id);

                    return resolve(null);
                } catch (err) {
                    return reject(err);
                }
            });
        });
    }).catch((err: Error) => {
        logger.error(`File upload went wrong due to ${err.message}`);

        finish(err, null);
    });
}

function createBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean) {
    const bucketEntry: api.CreateEntryFromFrameBody = {
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

    return fileObject.SaveFileInNetwork(bucketEntry);
}

async function getParities(file: Buffer, shardSize: number, totalShards: number, parityShards: number) {
    const fileEncoded = await encode(file, shardSize, totalShards, parityShards);

    return fileEncoded.slice(totalShards * shardSize);
}

function updateProgress(totalBytes: number, currentBytesUploaded: number, newBytesUploaded: number, progress: UploadProgressCallback): number {
    const newCurrentBytes = currentBytesUploaded + newBytesUploaded;
    const progressCounter = Math.ceil((newCurrentBytes / totalBytes) * 100);
    progress(progressCounter, newCurrentBytes, totalBytes);

    return newCurrentBytes;
}

interface UploadShardsAction {
    fileObject: FileObjectUpload;
    fileContent: Buffer;
    shardSize: number;
    nShards: number;
    firstIndex: number;
    parity: boolean;
}

function uploadShards(action: UploadShardsAction): Promise<ShardMeta>[] {
    let from = 0;
    let currentShard = null;
    const shardUploadRequests: Promise<ShardMeta>[] = [];

    for (let i = action.firstIndex; i < (action.firstIndex + action.nShards); i++) {
        currentShard = action.fileContent.slice(from, from + action.shardSize);

        console.log('Uploading shard index %s size %s parity %s', i, currentShard.length, action.parity);

        shardUploadRequests.push(uploadShard(action.fileObject, currentShard, i, action.parity));

        from += action.shardSize;
    }

    return shardUploadRequests;
}

function uploadShard(fileObject: FileObjectUpload, shard: Buffer, index: number, isParity: boolean): Promise<ShardMeta> {
    return fileObject.UploadShard(shard, shard.length, fileObject.frameId, index, 3, isParity);
}
