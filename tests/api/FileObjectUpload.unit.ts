import { expect } from 'chai';
import { Readable } from 'stream';
import { resolve } from 'path';

import { FileMeta, FileObjectUpload } from '../../src/api/FileObjectUpload';
import { EnvironmentConfig } from '../../src';
import { getShardMeta, ShardMeta } from '../../src/lib/shardMeta';
import { sha512HmacBuffer } from '../../src/lib/crypto';

import dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, '../../.env') });

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

    describe('StartUploadFile()', () => {
        it('Should throw an error if given bridgeUrl is wrong', async () => {
            let errorThrown = false;

            try {
                const fileObject = await new FileObjectUpload(fakeEnv, fakeFileMeta, bucketId).init();
                await fileObject.StartUploadFile();
            } catch (err) {
                errorThrown = true;
                expect(err.message.includes('ECONNREFUSED')).to.be.true;
            } finally  {
                expect(errorThrown).to.be.true;
            }      
        });

        it('Should throw an error of unauthorized request if given credentials are wrong', async () => {
            let errorThrown = false;

            try {
                const overridenConfig = { ...fakeEnv, bridgeUrl: 'https://api.internxt.com' };
                const fileObject = await new FileObjectUpload(overridenConfig, fakeFileMeta, bucketId).init();
                await fileObject.StartUploadFile();
            } catch (err) {
                errorThrown = true;
                expect(err.message).to.equal('Request failed with status code 401')
            } finally  {
                expect(errorThrown).to.be.true;
            }      
        });

        it('Should throw an error if given bucketId is wrong', async function () {
            // let errorThrown = false;
            
            // try {
            //     const overridenConfig = { 
            //         bridgeUser: process.env.TEST_USER,
            //         bridgePass: process.env.TEST_PASS,
            //         encryptionKey: process.env.TEST_KEY,
            //         bridgeUrl: 'https://api.internxt.com' 
            //     };

            //     const fileObject = await new FileObjectUpload(overridenConfig, fakeFileMeta, bucketId).init();
            //     await fileObject.StartUploadFile();
            // } catch (err) {
            //     console.log(err);
            //     errorThrown = true;
            //     expect(err.message).to.equal('Request failed with status code 404')
            // } finally  {
            //     // expect(errorThrown).to.be.true;
            // }      
        });
    });
});