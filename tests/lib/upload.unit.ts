import { expect } from 'chai';
import { Readable } from 'stream';

import { EnvironmentConfig } from '../../src';
import { FileMeta, FileObjectUpload } from "../../src/api/FileObjectUpload";
import { sha512HmacBuffer } from '../../src/lib/crypto';
import { getShardMeta, ShardMeta } from '../../src/lib/shardMeta';
import { generateBucketEntry } from "../../src/lib/upload";
import { CreateEntryFromFrameBody } from '../../src/services/request';

const fakeEnv: EnvironmentConfig = {
    bridgeUser: 'fake@user.com',
    bridgePass: 'fakepass',
    encryptionKey: ''
};

const size = 50;
const name = 'fakeFileName';
const bucketId = '';
const contentBuff = Buffer.alloc(size).fill(1);
const content = Readable.from(contentBuff);
const fakeFileMeta: FileMeta = { content, name, size };

describe('# Upload tests', () => {
    describe('createBucketEntry()', () => {
        it('Should return a well formed bucket entry', () => {
            const fileObject = new FileObjectUpload(fakeEnv, fakeFileMeta, bucketId);
            const shardMetaOne = getShardMeta(contentBuff, size, 0, false);
            const shardMetaTwo = getShardMeta(contentBuff.fill(2), size, 1, false);
            const shardMetas: ShardMeta[] = [shardMetaOne, shardMetaTwo];

            const frameId = 'fakeId';
            fileObject.frameId = frameId;

            const index = Buffer.from('fakeIndex');
            fileObject.index = index;

            const bucketEntry = generateBucketEntry(fileObject, fakeFileMeta, shardMetas, true);
            const expectedBucketEntry: CreateEntryFromFrameBody = {
                frame: frameId, 
                filename: name,
                index: index.toString('hex'),  
                erasure: {
                    type: 'reedsolomon'
                },
                hmac: {
                    type: 'sha512',
                    value: sha512HmacBuffer(fileObject.fileEncryptionKey)
                        .update(Buffer.from(shardMetaOne.hash, 'hex'))
                        .update(Buffer.from(shardMetaTwo.hash, 'hex'))
                        .digest('hex')
                },
            };

            expect(bucketEntry).to.deep.equal(expectedBucketEntry);
        });
    })
})