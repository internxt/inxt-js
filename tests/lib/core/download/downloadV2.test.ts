import sinon from 'sinon';
import { DownloadInvalidMnemonicError } from '@internxt/sdk/dist/network/errors'; 

import { ActionState, ActionTypes } from '../../../../src/api';
import { downloadFileV2 } from '../../../../src/lib/core/download/downloadV2';
import { getBridgeUrl, getBucketId, getFileId, getInvalidMnemonic, getNetworkCredentials } from '../fixtures';


const creds = getNetworkCredentials();
const bucketId = getBucketId();
const fileId = getFileId();
const bridgeUrl = getBridgeUrl();
const invalidMnemonic = getInvalidMnemonic();

beforeEach(() => {
  sinon.reset();
}); 

describe('downloadFileV2()', () => {
  describe('Should handle errors properly', () => {
    it('Should throw if the mnemonic is invalid', async () => {
      try {
        const [promise, outStream] = downloadFileV2(
          fileId,
          bucketId,
          invalidMnemonic,
          bridgeUrl,
          creds,
          () => {},
          new ActionState(ActionTypes.Upload),
          () => {}
        );

        await new Promise((resolve, reject) => {
          outStream.once('error', reject);
          outStream.once('end', resolve);
        });

        expect(true).toBeFalsy();
      } catch (err) {
        expect(err.message).toStrictEqual(new DownloadInvalidMnemonicError().message);
      }
    });
  });
});
