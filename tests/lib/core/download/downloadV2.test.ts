import { describe, expect, it } from 'vitest';
import { fail } from 'node:assert';
import { DownloadInvalidMnemonicError } from '@internxt/sdk/dist/network/errors';
import { downloadFileV2 } from '../../../../src/lib/core/download/downloadV2';
import { getBridgeUrl, getBucketId, getFileId, getInvalidMnemonic, getNetworkCredentials } from '../fixtures';

const creds = getNetworkCredentials();
const bucketId = getBucketId();
const fileId = getFileId();
const bridgeUrl = getBridgeUrl();
const invalidMnemonic = getInvalidMnemonic();

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
          { clientName: 'inxt-js', clientVersion: '1.0' },
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
