import { createDecipheriv, randomBytes } from 'crypto';
import { PassThrough, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { validateMnemonic } from 'bip39';

import { ALGORITHMS, DecryptFileFunction, DownloadFileFunction, Network } from '@internxt/sdk/dist/network';
import { downloadFile, FileVersionOneError } from '@internxt/sdk/dist/network/download';

import { getStream } from '../../../services/request';
import { GenerateFileKey, sha256 } from '../../utils/crypto';
import { Events as ProgressEvents, HashStream, ProgressNotifier } from '../../utils/streams';
import { DownloadProgressCallback } from '.';
import Errors from './errors';
import { ChunkSizeTransform } from '../../utils/streams/Chunker';
import { AppDetails } from '@internxt/sdk/dist/shared';

export function downloadFileV2(
  fileId: string,
  bucketId: string,
  mnemonic: string,
  bridgeUrl: string,
  creds: { pass: string; user: string },
  appDetails: AppDetails,
  notifyProgress: DownloadProgressCallback,
  onV2Confirmed: () => void,
  abortController: AbortController,
  chunkSize?: number,
): [Promise<void>, PassThrough] {
  const outStream = new PassThrough();
  const network = Network.client(
    bridgeUrl,
    {
      ...appDetails,
      customHeaders: {
        lib: 'inxt-js',
        ...appDetails.customHeaders,
      },
    },
    {
      bridgeUser: creds.user,
      userId: sha256(Buffer.from(creds.pass)).toString('hex'),
    },
  );

  const fileEncryptedSlices: {
    stream: Readable;
    hash: string;
  }[] = [];

  const downloadFileStep: DownloadFileFunction = async (downloadables) => {
    onV2Confirmed();

    for (const downloadable of downloadables.sort((dA, dB) => dA.index - dB.index)) {
      fileEncryptedSlices.push({
        hash: downloadable.hash,
        stream: await getStream(downloadable.url),
      });
    }
  };

  const decryptFileStep: DecryptFileFunction = async (algorithm, key, iv, fileSize) => {
    if (algorithm !== ALGORITHMS.AES256CTR.type) {
      throw Errors.downloadUnknownAlgorithmError;
    }

    const decipher = createDecipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
    const progress = new ProgressNotifier(fileSize, 2000, { emitClose: false });

    progress.on(ProgressEvents.Progress, (progress: number) => {
      notifyProgress(progress, null, null);
    });

    for (const fileEncryptedSlice of fileEncryptedSlices) {
      const hasher = new HashStream();

      if (chunkSize) {
        const chunker = new ChunkSizeTransform(chunkSize);
        await pipeline(fileEncryptedSlice.stream, hasher, decipher, progress, chunker, outStream, {
          signal: abortController.signal,
        });
      } else {
        await pipeline(fileEncryptedSlice.stream, hasher, decipher, progress, outStream, {
          signal: abortController.signal,
        });
      }

      const calculatedHash = hasher.getHash().toString('hex');
      const expectedHash = fileEncryptedSlice.hash;

      if (calculatedHash !== expectedHash) {
        throw Errors.downloadHashMismatchError;
      }
    }

    await new Promise((res) => progress.end(res));
  };

  const downloadPromise = downloadFile(
    fileId,
    bucketId,
    mnemonic,
    network,
    {
      validateMnemonic: (mnemonic) => {
        return validateMnemonic(mnemonic);
      },
      algorithm: ALGORITHMS.AES256CTR,
      randomBytes,
      generateFileKey: (mnemonic, bucketId, index) => {
        return GenerateFileKey(mnemonic, bucketId, index as Buffer | string);
      },
    },
    Buffer.from,
    downloadFileStep,
    decryptFileStep,
  ).catch((err) => {
    if (err instanceof FileVersionOneError) {
      throw err;
    }
    outStream.emit('error', err);
  });

  return [downloadPromise, outStream];
}
