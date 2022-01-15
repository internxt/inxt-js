import { randomBytes } from "crypto";
import { Readable } from "stream";

import { ContractMeta } from "../../../../src/api";
import { Events, NegotiateContract, upload, UploadOneShardStrategy } from "../../../../src/lib/core";
import { ShardMeta } from "../../../../src/lib/models";

let uploadStrategy: UploadOneShardStrategy;

const content = randomBytes(16*1024);

async function fakeNegotiateContract(shardMeta: ShardMeta): Promise<ContractMeta> {
  return {
    farmer: {
      address: 'test.internxt.com',
      lastSeen: new Date().getTime(),
      nodeID: '',
      port: 99999,
      protocol: '1.2.0-INXT',
      userAgent: ''
    },
    hash: '',
    operation: 'PUSH',
    token: '',
    url: ''
  };
}

beforeEach(() => {
  uploadStrategy = new UploadOneShardStrategy({
    sourceToHash: {
      size: content.length,
      stream: Readable.from(content)
    },
    sourceToUpload: {
      size: content.length,
      stream: Readable.from(content)
    },
    useProxy: false
  });
});

describe('UploadOneShardStrategy', () => {
  describe('setFileEncryptionKey()', () => {
    describe('File Encryption Key validation', () => {
      describe('Size validation', () => {
        it('Should reject an invalid size', () => {
          const tooShortFileEncryptionKey = randomBytes(31);
          const tooLongFileEncryptionKey = randomBytes(33);
  
          expect(() => {
            uploadStrategy.setFileEncryptionKey(tooShortFileEncryptionKey);
          }).toThrowError();

          expect(() => {
            uploadStrategy.setFileEncryptionKey(tooLongFileEncryptionKey);
          }).toThrowError();
        });

        it('Should accept a valid size', () => {
          const fileEncryptionKeyWithProperLength = randomBytes(32);
          uploadStrategy.setFileEncryptionKey(fileEncryptionKeyWithProperLength);
    
          expect(uploadStrategy.fileEncryptionKey).toEqual(
            fileEncryptionKeyWithProperLength
          );
        });
      });
    });
  });

  describe('setIv()', () => {
    describe('Initialization Vector (IV) validation', () => {
      describe('Size validation', () => {
        it('Should reject an invalid size', () => {
          const tooLongIv = randomBytes(17);
          const tooShortIv = randomBytes(15);

          expect(() => uploadStrategy.setIv(tooLongIv)).toThrow();
          expect(() => uploadStrategy.setIv(tooShortIv)).toThrow();
        });

        it('Should accept a valid size', () => {
          const properLengthIv = randomBytes(16);

          uploadStrategy.setIv(properLengthIv);

          expect(uploadStrategy.iv).toEqual(properLengthIv);
        });
      });
    });
  });

  describe('upload()', () => {
    describe('Required data check', () => {
      it('Should reject if file encryption key or iv are not set', () => {
        expect(uploadStrategy.upload(fakeNegotiateContract))
          .rejects.toEqual(
            new Error('Set file encryption key and iv before trying to upload')
          );
      }); 
    });
  });

  describe('abort()', () => {
    describe('Events emitted', () => {
      it('Should emit an upload abort event if upload is aborted', (done) => {
        const timeout = setTimeout(() => {
          expect(true).toBeFalsy();
          done();
        }, 100);

        uploadStrategy.once(Events.Upload.Abort, () => {
          clearTimeout(timeout);
          expect(true).toBeTruthy();
          done();
        });
        uploadStrategy.abort();        
      });
    });
  });
});
