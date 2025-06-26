import sinon from 'sinon';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { fail } from 'node:assert';
import { DownloadInvalidMnemonicError } from '@internxt/sdk/dist/network/errors';
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
          () => {},
          new AbortController(),
        );

        await new Promise((resolve, reject) => {
          outStream.once('error', reject);
          outStream.once('end', resolve);
        });

        fail('Expected function to throw an error, but it did not.');
      } catch (err) {
        const error = err as Error;
        expect(error.message).toStrictEqual(new DownloadInvalidMnemonicError().message);
      }
    });
  });
});
