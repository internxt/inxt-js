import { expect } from 'chai';
import { stub, spy, SinonSpy } from 'sinon';
import { Readable } from 'stream';

import { UploaderQueue, UploadRequest } from '../../src/lib/upload/uploader';
import { FileObjectUpload } from '../../src/api/FileObjectUpload';
import { logger } from '../../src/lib/utils/logger';
import { ShardMeta } from '../../src/lib/shardMeta';

let fileObject = new FileObjectUpload({
    bridgePass: '',
    bridgeUser: '',
    bridgeUrl: ''
}, {
    content: Readable.from(''),
    name: '',
    size: 1
}, 'fakeBucketId', logger);

beforeEach(() => {
    fileObject = new FileObjectUpload({
        bridgePass: '',
        bridgeUser: '',
        bridgeUrl: ''
    }, {
        content: Readable.from(''),
        name: '',
        size: 1
    }, 'fakeBucketId', logger);
})

const defConcurrency = 1;

function createFakeShardMeta(): ShardMeta {
  return {
    hash: '',
    challenges_as_str: [''],
    index: 0,
    parity: false,
    size: 0,
    tree: [],
    challenges: [],
    exclude: []
  }
}

function createFakeUploadRequest(): UploadRequest {
  return { content: Buffer.from(''), index: 0, finishCb: () => {} };
}

async function fakeUploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number, parity: boolean) {
  return createFakeShardMeta();
}

describe('# lib/upload/uploader tests', () => {
    describe('on()', () => {
      it('Should register all listeners', function() {
        const queue: UploaderQueue = new UploaderQueue(defConcurrency, defConcurrency, fileObject);

        const desiredFakeEvents = 10;
        const fakeEvents: string[] = []
        const emptyFunction = () => {};

        for (let i = 0; i < desiredFakeEvents; i++) {
          fakeEvents.push(`event-${i}`);
          queue.on(`event-${i}`, emptyFunction);
        }

        fakeEvents.forEach((event) => {
          expect(queue.getListenerCount(event)).to.equal(1);
          expect(queue.getListeners(event).length).to.equal(1);
          expect(queue.getListeners(event)[0]).to.deep.equal(emptyFunction);
        });
      })
    });

    describe('emit()', () => {
      it('Should emit all events', function(done) {
        const queue: UploaderQueue = new UploaderQueue(defConcurrency, defConcurrency, fileObject);

        const fakeEvents: string[] = [];
        const emitedEvents: boolean[] = [];
        const desiredFakeEvents = 10;

        for (let i = 0; i < desiredFakeEvents; i++) {
          fakeEvents.push(`event-${i}`);
        }

        queue.on('end', () => {
          expect(emitedEvents.length).to.equal(fakeEvents.length);
          done();
        });

        fakeEvents.forEach((event) => {
          queue.on(event, () => {
            emitedEvents.push(true);
          });
          queue.emit(event);
        });

        queue.emit('end');
      })
    });

    describe('end()', () => {
      it('Should emit end event', function (done) {
        const queue = new UploaderQueue(defConcurrency, defConcurrency, fileObject);

        queue.on('end', () => done());
        queue.emit('end');
      })
    })

    describe('upload()', () => {
      it('Should call finished callback of every task if provided', function(done) {
        const uploadRequests: UploadRequest[] = [];
        const spies: SinonSpy[] = [];
        const desiredUploadRequests = 10;

        let currentUploadRequest: UploadRequest = createFakeUploadRequest();

        for (let i = 0; i < desiredUploadRequests; i++) {
          currentUploadRequest = createFakeUploadRequest();
          uploadRequests.push(currentUploadRequest);

          spies[i] = spy();
          currentUploadRequest.finishCb = spies[i];
        }

        stub(fileObject, 'uploadShard').callsFake(fakeUploadShard);
        const queue = new UploaderQueue(defConcurrency, desiredUploadRequests, fileObject);

        uploadRequests.forEach(queue.push.bind(queue));

        queue.end(() => {
          spies.forEach((spy) => {
            expect(spy.called).to.be.true;
            expect(spy.callCount).to.equal(1);
          });

          done();
        });
      });

      it('Should save shard meta for each upload request', function(done) {
        const uploadRequests: UploadRequest[] = [];
        const desiredUploadRequests = 10;

        let currentUploadRequest: UploadRequest = createFakeUploadRequest();

        for (let i = 0; i < desiredUploadRequests; i++) {
          currentUploadRequest = createFakeUploadRequest();
          uploadRequests.push(currentUploadRequest);
        }

        stub(fileObject, 'uploadShard').callsFake(fakeUploadShard);
        const queue = new UploaderQueue(defConcurrency, desiredUploadRequests, fileObject);

        uploadRequests.forEach(queue.push.bind(queue));

        queue.end(() => {
          expect(fileObject.shardMetas.length).to.equal(uploadRequests.length);

          uploadRequests.forEach((req) => {
            expect(fileObject.shardMetas.find(shardMeta => shardMeta.index === req.index)).to.not.be.null;
          });

          done();
        });
      });
    })

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
});
