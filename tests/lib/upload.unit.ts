import { expect } from 'chai';
import { Readable } from 'stream';

import { EnvironmentConfig } from '../../src';
import { FileMeta, FileObjectUpload, generateBucketEntry } from '../../src/api/FileObjectUpload';
import { logger } from '../../src/lib/utils/logger';
import { CreateEntryFromFrameBody } from '../../src/services/api';

const fakeEnv: EnvironmentConfig = {
  bridgeUser: 'fake@user.com',
  bridgePass: 'fakepass',
  encryptionKey: '',
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
      const fileObject = new FileObjectUpload(fakeEnv, fakeFileMeta, bucketId, logger);

      const shardsHashes = [
        '688b4be7ee0ebf12168497c5839334f08ef87e09',
        '3b368add6e295b55d843ce5e858a4aa5eb84f9f6',
        'd750b878f790ffe35c29f4554e452a974687b3b4',
        '50d9140e40b2b4381b54ecf76b37d6b5a6de8685',
        'ba9a6ee86ebc19de41536351f1fc016ef27e4402',
        '36ca9ac9858cd0871635b59eeb51f5fbcf8df2bb',
        'b67cfdc6b3d57303ce38e095690b2caebb7a1f79',
        'bc68eb1c8df26036628824daf9194f57d01b7d2c',
        'bc31c6334277b75ab404c550541471e52d4e38a1',
        '0c08f214fe861e7942d802dcd3cdd2077103a14b',
        '638ffb6491e49d5848cd961f5352c41f1b0ceea0',
        '88d0229e598ab3aa279527629b21ddbc70854050',
        'c0846e015de2e2602d9bfe45d148fe864ac37dc7',
        '45a334c54c415184a9f2ea7fb6dcbef1d5253fb9',
      ];

      const frameId = 'fakeId';
      fileObject.frameId = frameId;

      fileObject.index = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex');
      fileObject.fileEncryptionKey = Buffer.from(
        'fdaebc990db7cd3dab1ffac132cedfc856907fcdb660bf23dc32485f68a7e93e',
        'hex',
      );

      const hmac = fileObject.GenerateHmac(
        shardsHashes.map((shardHash, index) => {
          return {
            hash: shardHash,
            index,
            challenges_as_str: [],
            parity: false,
            size: 0,
            tree: [],
          };
        }),
      );

      const bucketEntry: CreateEntryFromFrameBody = {
        frame: frameId,
        filename: name,
        index: fileObject.index.toString('hex'),
        hmac: {
          type: 'sha512',
          value: hmac,
        },
      };

      const expectedBucketEntry: CreateEntryFromFrameBody = {
        frame: frameId,
        filename: name,
        index: fileObject.index.toString('hex'),
        hmac: {
          type: 'sha512',
          value:
            'e92a92ffbb5230e57b4c6027e97f881efa89816ca6835d5cc91ff654a4c60a077c081edb7933b31d2ab8eba21825afb52fa8b84e1c9fb1ddbf8713898df4959e',
        },
      };

      expect(bucketEntry).to.deep.equal(expectedBucketEntry);
    });
  });
});
