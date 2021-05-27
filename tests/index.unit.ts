import { expect } from 'chai';
import { Readable } from 'stream';

import { EnvironmentConfig, Environment } from '../src';

const fakeEnv: EnvironmentConfig = {
    bridgeUser: 'fake@user.com',
    bridgePass: 'fakepass',
    encryptionKey: ''
};

let bucketId = '';

describe('# Inxt-js api tests', () => {
    describe('UploadFile()', () => {
        it('Should throw an error if any of the required params are wrong', async () => {
            let env = new Environment(fakeEnv);

            await new Promise((resolve) => {
                env.uploadFile(bucketId, {
                    fileContent: null,
                    fileSize: 0,
                    filename: '',
                    progressCallback: () => { },
                    finishedCallback: (err) => {
                        expect(err).not.to.be.null;
                        expect(err.message).to.equal('Mnemonic was not provided, please, provide a mnemonic')
                        resolve(null);
                    }
                });
            });

            fakeEnv.encryptionKey = 'eooeoee';
            env = new Environment(fakeEnv);

            await new Promise((resolve) => {
                env.uploadFile(bucketId, {
                    fileContent: null,
                    fileSize: 0,
                    filename: '',
                    progressCallback: () => { },
                    finishedCallback: (err) => {
                        expect(err).not.to.be.null;
                        expect(err.message).to.equal('Bucket id was not provided');
                        resolve(null);
                    }
                });
            });

            bucketId = 'eoeoeo';

            await new Promise((resolve) => {
                env.uploadFile(bucketId, {
                    fileContent: null,
                    fileSize: 0,
                    filename: '',
                    progressCallback: () => { },
                    finishedCallback: (err) => {
                        expect(err).not.to.be.null;
                        expect(err.message).to.equal('Filename was not provided');
                        resolve(null);
                    }
                });
            });

            await new Promise((resolve) => {
                env.uploadFile(bucketId, {
                    // fake Blob type as doesn't exist in Node.js
                    fileContent: { size: 0, type: null, arrayBuffer: null, slice: null, stream: null, text: null },
                    fileSize: 0,
                    filename: 'oeoeo',
                    progressCallback: () => { },
                    finishedCallback: (err) => {
                        expect(err).not.to.be.null;
                        expect(err.message).to.equal('Can not upload a file with size 0');
                        resolve(null);
                    }
                });
            });
        });
    })
})