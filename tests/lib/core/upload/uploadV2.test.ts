import { describe, expect, it } from 'vitest';
import { fail } from 'node:assert';
import { Readable } from 'stream';
import { UploadInvalidMnemonicError } from '@internxt/sdk/dist/network/errors';
import { ActionState, ActionTypes } from '../../../../src/api';
import { uploadFileV2 } from '../../../../src/lib/core/upload/uploadV2';
import {
  getBridgeUrl,
  getBucketId,
  getFileBytes,
  getInvalidMnemonic,
  getNetworkCredentials,
  getValidMnemonic,
} from '../fixtures';

const creds = getNetworkCredentials();
const bucketId = getBucketId();
const bridgeUrl = getBridgeUrl();
const fileContent = 'some text that i have in the file';
const fileBytes = getFileBytes(fileContent);
const validMnemonic = getValidMnemonic();
const invalidMnemonic = getInvalidMnemonic();

describe('uploadFileV2()', () => {
  describe('Should handle errors properly', () => {
    it('Should throw if the mnemonic is invalid', async () => {
      try {
        await uploadFileV2(
          0,
          Readable.from(fileBytes),
          bucketId,
          invalidMnemonic,
          bridgeUrl,
          creds,
          { clientName: 'inxt-js', clientVersion: '1.0' },
          () => {},
          new ActionState(ActionTypes.Upload),
        );

        fail('Expected function to throw an error, but it did not.');
      } catch (err) {
        const error = err as Error;
        expect(error.message).toStrictEqual(new UploadInvalidMnemonicError().message);
      }
    });
  });
});
