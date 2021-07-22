import { expect } from 'chai';

import { generateShard, generateShardMeta } from '../mocks';
import { Bridge, Methods } from '../../src/services/api';

const bridgeUrl = 'https://api.internxt.com';
const bridgePass = 'bridgePass';
const bridgeUser = 'fake@user.com';
const bridge = new Bridge({ bridgePass, bridgeUser, bridgeUrl });

describe('services/api.ts', () => {
  describe('Bridge', () => {
    describe('# constructor()', () => {
      it('Should throw if bridge url is empty', () => {
        expect(() => {
          const b = new Bridge({ bridgeUser: 'fake@user.com', bridgePass: 'fakePass', bridgeUrl: '' });
        }).to.throw('Empty bridge url');
      });
    });

    describe('# getBucketById()', () => {
      it('Should GET /buckets/:bucketId', () => {
        const bucketId = 'fakeBucketId';
        const expectedUrl = bridgeUrl + '/buckets/' + bucketId;
        const request = bridge.getBucketById(bucketId);

        expect(request.targetUrl).to.equal(expectedUrl);
      });
    });

    describe('# getFileById()', () => {
      it('Should GET /buckets/:bucketId/file-ids/:fileId', () => {
        const bucketId = 'fakeBucketId';
        const fileId = 'fakeFileId';
        const expectedUrl = bridgeUrl + '/buckets/' + bucketId + '/file-ids/' + fileId;

        const request = bridge.getFileById(bucketId, fileId);

        expect(request.targetUrl).to.equal(expectedUrl);
        expect(request.method).to.equal(Methods.Get);
      });
    });

    describe('# createFrame()', () => {
      it('Should POST /frames', () => {
        const expectedUrl = bridgeUrl + '/frames';
        const request = bridge.createFrame();

        expect(request.targetUrl).to.equal(expectedUrl);
        expect(request.method).to.equal(Methods.Post);
      });
    });

    describe('# createEntryFromFrame()', () => {
      it('Should POST /buckets/:bucketId/files', () => {
        const bucketId = 'bucketId';
        const path = `buckets/${bucketId}/files`;
        const expectedUrl = bridgeUrl + '/' + path;

        const request = bridge.createEntryFromFrame(bucketId, {
          filename: '',
          frame: '',
          hmac: { type: 'sha512', value: 'meloinvento' },
          index: '0',
        });

        expect(request.targetUrl).to.equal(expectedUrl);
        expect(request.method).to.equal(Methods.Post);
      });
    });

    describe('# addShardToFrame()', () => {
      it('Should PUT /frames/:frameId', () => {
        const frameId = 'frameId';
        const path = `frames/${frameId}`;
        const expectedUrl = bridgeUrl + '/' + path;

        const request = bridge.addShardToFrame(frameId, generateShardMeta());

        expect(request.targetUrl).to.equal(expectedUrl);
        expect(request.method).to.equal(Methods.Put);
      });
    });

    describe('# sendShardToNode()', () => {
      it('Should POST to farmerPath/shards/:shardHash?token=TOKEN', () => {
        const shard = generateShard();
        const request = bridge.sendShardToNode(shard);
        const expectedUrl = `http://${shard.farmer.address}:${shard.farmer.port}/shards/${shard.hash}?token=${shard.token}`;

        expect(request.targetUrl).to.equal(expectedUrl);
        expect(request.method).to.equal(Methods.Post);
      });
    });
  });
});
