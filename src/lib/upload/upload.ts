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
            let uploadedBytes = 0;
            let progressCounter = 0;

            const uploadShardPromises: Promise<ShardMeta>[] = [];

            progress(0, uploadedBytes, totalBytes);

            out.on('data', async (shard: Buffer) => {
                fileContent = Buffer.concat([fileContent, shard]);
            });

            out.on('error', reject);

            out.on('end', async () => {
                const fileSize = fileContent.length;
                const shardSize = utils.determineShardSize(fileSize);
                const nShards = Math.ceil(fileSize / shardSize);
                const parityShards = utils.determineParityShards(nShards);

                console.log('Shards obtained %s, shardSize %s', nShards, shardSize);

                let from = 0;
                let currentIndex = 0;
                let currentShard = null;

                let totalSize = fileSize;

                if (fileSize >= MIN_SHARD_SIZE) {
                    totalSize += parityShards * shardSize;
                }

                const sendShard = async (encryptedShard: Buffer, index: number, isParity: boolean): Promise<ShardMeta> => {
                    const response = await File.UploadShard(encryptedShard, encryptedShard.length, File.frameId, index, 3, isParity);

                    uploadedBytes += encryptedShard.length;
                    progressCounter += (encryptedShard.length / totalSize) * 100;

                    console.log('Upload bytes %s (%s)', uploadedBytes, progressCounter);

                    progress(progressCounter, uploadedBytes, totalSize);

                    return response;
                };

                // upload content
                for (let i = 0; i < nShards; i++, currentIndex++, from += shardSize) {
                    currentShard = fileContent.slice(from, from + shardSize);

                    console.log("Uploading std shard with size %s, index %s", currentShard.length, currentIndex);

                    uploadShardPromises.push(sendShard(currentShard, currentIndex, false));
                }

                from = 0;

                if (fileSize >= MIN_SHARD_SIZE) {
                    // =========== RS ============
                    console.log({ shardSize, nShards, parityShards, fileContentSize: fileContent.length });
                    console.log("Applying Reed Solomon. File size %s. Creating %s parities", fileContent.length, parityShards);

                    const fileEncoded = await encode(fileContent, shardSize, nShards, parityShards);
                    

                    const parities = fileEncoded.slice(nShards * shardSize);
                    // ===========================
                    console.log("Parities content size", parities.length);

                    // upload parities
                    for (let i = 0; i < parityShards; i++, currentIndex++, from += shardSize) {
                        currentShard = Buffer.from(parities.slice(from, from + shardSize));

                        console.log("Uploading parity shard with size %s, index %s", currentShard.length, currentIndex);

                        uploadShardPromises.push(sendShard(currentShard, currentIndex, true));
                    }
                } else {
                    console.log('File too small (%s), not creating parities', fileSize);
                }

                try {
                    console.log('Waiting for upload to progress');
                    const uploadShardResponses = await Promise.all(uploadShardPromises);
                    console.log('Upload finished');

                    // TODO: Check message and way of handling
                    if (uploadShardResponses.length === 0) { 
                        throw new Error('no upload requests has been made'); 
                    }

                    const bucketEntry: api.CreateEntryFromFrameBody = {
                        frame: File.frameId,
                        filename: fileMeta.name,
                        index: File.index.toString('hex'),
                        hmac: {
                            type: 'sha512',
                            value: File.GenerateHmac(uploadShardResponses)
                        }
                    };

                    if (fileSize >= MIN_SHARD_SIZE) {
                        bucketEntry.erasure = { type: "reedsolomon" };
                    }

                    const savingFileResponse = await File.SaveFileInNetwork(bucketEntry);

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
