import { expect } from 'chai';
import { Readable } from 'stream';

import { FileMeta, FileObjectUpload } from '../../src/api/FileObjectUpload';
import { EnvironmentConfig } from '../../src';
import { getShardMeta, ShardMeta } from '../../src/lib/shardMeta';
import { sha512HmacBuffer } from '../../src/lib/crypto';

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

describe('# FileObjectUpload tests', () => {
    it('Should generate HMAC from shard hashes correctly', async () => {
        const shardMetaOne = getShardMeta(contentBuff, size, 0, false);
        const shardMetaTwo = getShardMeta(contentBuff.fill(2), size, 1, false);
        const shardMetas: ShardMeta[] = [shardMetaOne, shardMetaTwo];

        const fileObject = await new FileObjectUpload(fakeEnv, fakeFileMeta, bucketId).init();
        const expectedHmac = sha512HmacBuffer(fileObject.fileEncryptionKey)
            .update(Buffer.from(shardMetaOne.hash, 'hex'))
            .update(Buffer.from(shardMetaTwo.hash, 'hex'))
            .digest('hex');

        expect(fileObject.GenerateHmac(shardMetas)).to.equal(expectedHmac);
    });
});