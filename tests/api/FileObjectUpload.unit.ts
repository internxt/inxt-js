import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { createSandbox } from 'sinon';
import { Readable } from 'stream';

import { FileObjectUpload } from '../../src/api/FileObjectUpload';
import { logger } from '../../src/lib/utils/logger';
import EncryptStream from '../../src/lib/encryptStream';
import { createCipheriv, randomBytes } from 'crypto';
import { ripemd160, sha256 } from '../../src/lib/crypto';
import { getContractNegotiated, spawnFarmer as startFarmer } from '../mocks';
import { getSilentLogger } from '../mocks';
import { Bridge, Methods } from '../../src/services/api';
import { INXTRequest } from '../../src/services/request';

const { expect } = chai;
chai.use(chaiAsPromised);

function initializeFileObject() {
  return new FileObjectUpload({
    bridgePass: '',
    bridgeUser: '',
    bridgeUrl: 'https://api.internxt.com'
  }, {
    content: Readable.from(''),
    name: '',
    size: 1
  }, 'fakeBucketId', logger);
}

let fileObject = initializeFileObject();

beforeEach(() => {
  fileObject = initializeFileObject();
});

describe('# FileObjectUpload tests', () => {
  const sandbox = createSandbox();

  describe('GenerateHmac()', () => {
    it('Should generate the hmac from shard hashes when shard hashes are ordered', () => {
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
        '45a334c54c415184a9f2ea7fb6dcbef1d5253fb9'
      ];

      const frameId = 'fakeId';
      fileObject.frameId = frameId;

      fileObject.index = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex');
      fileObject.fileEncryptionKey = Buffer.from('fdaebc990db7cd3dab1ffac132cedfc856907fcdb660bf23dc32485f68a7e93e', 'hex');

      const hmac = fileObject.GenerateHmac(shardsHashes.map((shardHash, index) => {
        return {
          hash: shardHash,
          index,
          challenges_as_str: [],
          parity: false,
          size: 0,
          tree: []
        }
      }));

      const expectedHmac = 'e92a92ffbb5230e57b4c6027e97f881efa89816ca6835d5cc91ff654a4c60a077c081edb7933b31d2ab8eba21825afb52fa8b84e1c9fb1ddbf8713898df4959e';

      expect(hmac).to.deep.equal(expectedHmac);
    });

    it('Should generate the hmac from shard hashes when shard hashes are unordered', () => {
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
        '45a334c54c415184a9f2ea7fb6dcbef1d5253fb9'
      ];

      const frameId = 'fakeId';
      fileObject.frameId = frameId;

      fileObject.index = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex');
      fileObject.fileEncryptionKey = Buffer.from('fdaebc990db7cd3dab1ffac132cedfc856907fcdb660bf23dc32485f68a7e93e', 'hex');

      const hmac = fileObject.GenerateHmac(
        shardsHashes.map((shardHash, index) => {
          return {
            hash: shardHash,
            index,
            challenges_as_str: [],
            parity: false,
            size: 0,
            tree: []
          }
        }).sort((sMetaA, sMetaB) => sMetaB.index - sMetaA.index)
      );

      const expectedHmac = 'e92a92ffbb5230e57b4c6027e97f881efa89816ca6835d5cc91ff654a4c60a077c081edb7933b31d2ab8eba21825afb52fa8b84e1c9fb1ddbf8713898df4959e';

      expect(hmac).to.deep.equal(expectedHmac);
    });
  });

  describe('init()', () => {
    it('Should initialize file object', async () => {
      fileObject = await initializeFileObject().init();

      expect(fileObject.index.length).to.equal(32);
      expect(fileObject.fileEncryptionKey).to.not.be.null;
      expect(fileObject.cipher).to.be.instanceOf(EncryptStream);
    });
  });

  describe('upload()', () => {
    it('Should throw if encrypt() is not called before', () => {
      expect(() => { fileObject.upload(() => {}); }).to.throw(
        'Tried to upload a file not encrypted. Use .encrypt() before upload()'
      );
    });

    it('Should send shards without errors', (done) => {
      const randomContentBuf = randomBytes(1 * 1024 * 1024);
      const randomContent = Readable.from(randomContentBuf); // 1Mb

      const config = { bridgePass: '', bridgeUser: '', bridgeUrl: 'https://api.internxt.com' };
      const fileMeta = { content: randomContent, name: '', size: 1 };
      const bridge = new Bridge(config);

      new FileObjectUpload(config, fileMeta, 'fakeBucketId', getSilentLogger(), bridge).init().then((fileObject) => {
        const cipher = createCipheriv('aes-256-ctr', fileObject.fileEncryptionKey, fileObject.index.slice(0, 16));
        cipher.write(randomContentBuf);
        const encryptedContent = cipher.read();
        const expectedHash = ripemd160(sha256(encryptedContent)).toString('hex');

        sandbox.stub(bridge, 'sendShardToNode').returns(new INXTRequest(config, Methods.Post, 'http://localhost:54321/shards/' + expectedHash, false));
        sandbox.stub(fileObject, 'negotiateContract').returns(new Promise((r) => r(getContractNegotiated())));

        fileObject.encrypt();

        let stopFarmer;

        startFarmer().then((stop) => {
          stopFarmer = stop;

          return fileObject.upload(() => null);
        }).then(() => {
          stopFarmer();
        }).finally(() => { 
          done();
        });
      });      
    });
  });

  describe('encrypt()', () => {
    it('Should mark file object as encrypted', () => {
      fileObject.encrypt();

      expect(fileObject.encrypted).to.be.true;
    });

    it('Should pipe file content to cipher through funnel', (done) => {
      const filecontent = 'eeee';
      const filecontentStream = Readable.from(filecontent);
      fileObject = new FileObjectUpload({
        bridgePass: '',
        bridgeUser: '',
        bridgeUrl: 'https://api.internxt.com'
      }, {
        content: filecontentStream,
        name: '',
        size: 1
      }, 'fakeBucketId', logger);

      fileObject.encrypt();
      fileObject.cipher.on('data', () => {});
      fileObject.cipher.on('end', () => {
        done();
      });
    });
  });

  describe('uploadShard()', () => {
    it('Should call the correct endpoint', () => {

    });
  });
});
