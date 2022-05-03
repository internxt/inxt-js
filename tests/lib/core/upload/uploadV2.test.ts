import sinon from 'sinon';
import { Readable } from 'stream';
import { UploadInvalidMnemonicError } from '@internxt/sdk/dist/network/errors'; 

import { ActionState, ActionTypes } from '../../../../src/api';
import { uploadFileV2 } from '../../../../src/lib/core/upload/uploadV2';
import { getBridgeUrl, getBucketId, getFileBytes, getInvalidMnemonic, getNetworkCredentials, getValidMnemonic } from './fixtures';


const creds = getNetworkCredentials();
const bucketId = getBucketId();
const bridgeUrl = getBridgeUrl();
const fileContent = 'some text that i have in the file'
const fileBytes = getFileBytes(fileContent);
const validMnemonic = getValidMnemonic();
const invalidMnemonic = getInvalidMnemonic();

beforeEach(() => {
  sinon.reset();
}); 

describe('uploadFileV2()', () => {
  describe('Should handle errors properly', () => {
    it('Should throw is mnemonic is invalid', async () => {
      try {
        await uploadFileV2(
          0,
          Readable.from(fileBytes),
          bucketId, 
          invalidMnemonic,
          bridgeUrl,
          creds,
          () => {},
          new ActionState(ActionTypes.Upload)
        );

        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(UploadInvalidMnemonicError);
      }
    });
  });
});
