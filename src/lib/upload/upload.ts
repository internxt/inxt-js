import { EnvironmentConfig, UploadProgressCallback, UploadFinishCallback } from "../..";
import { FileObjectUpload, FileMeta } from "../../api/FileObjectUpload";
import EncryptStream from "../encryptStream";

import { ShardMeta } from '../shardMeta';

import * as api from '../../services/request';
import { logger } from "../utils/logger";

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
        throw new Error('encryption key is null');
    }

    const File = new FileObjectUpload(config, fileMeta, bucketId);

    File.init().then(() => File.StartUploadFile()).then((out: EncryptStream) => {
        return new Promise((resolve, reject) => {
            const totalBytes = fileMeta.size;
            let uploadedBytes = 0;
            let progressCounter = 0;

            const uploadShardPromises: Promise<ShardMeta>[] = [];

            progress(0, uploadedBytes, totalBytes);

            out.on('data', async (encryptedShard: Buffer) => {
                const rawShard = out.shards.pop();

                if (!rawShard) {
                    return reject('raw shard is null');
                }

                const { size, index } = rawShard;

                if (size !== encryptedShard.length) {
                    return reject(`shard size calculated ${size} and encrypted shard size ${encryptedShard.length} do not match`);
                }

                const generateShardPromise = async (): Promise<ShardMeta> => {
                    const response = await File.UploadShard(encryptedShard, size, File.frameId, index, 3);

                    uploadedBytes += size;
                    progressCounter += (size / totalBytes) * 100;
                    progress(progressCounter, uploadedBytes, totalBytes);

                    return response;
                };

                uploadShardPromises.push(generateShardPromise());
            });

            out.on('error', reject);

            out.on('end', async () => {
                try {
                    const uploadShardResponses = await Promise.all(uploadShardPromises);

                    if (uploadShardResponses.length === 0) { throw new Error('no upload requests has been made'); }

                    const bucketEntry: api.CreateEntryFromFrameBody = {
                        frame: File.frameId,
                        filename: fileMeta.name,
                        index: File.index.toString('hex'),
                        hmac: {
                            type: 'sha512',
                            value: File.GenerateHmac(uploadShardResponses)
                        }
                    };

                    const savingFileResponse = await File.SaveFileInNetwork(bucketEntry);

                    if (!savingFileResponse) { throw new Error('saving file response is null'); }

                    progress(100, totalBytes, totalBytes);
                    finish(null, savingFileResponse);

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
