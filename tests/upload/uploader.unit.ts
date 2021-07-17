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
});
