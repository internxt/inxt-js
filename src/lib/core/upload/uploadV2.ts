import { Cipheriv, createCipheriv, randomBytes } from 'crypto';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { pipeline as undiciPipeline } from 'undici';
import { validateMnemonic } from 'bip39';

import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { ALGORITHMS, Network } from '@internxt/sdk/dist/network';

import { GenerateFileKey, sha256 } from '../../utils/crypto';
import { Events as ProgressEvents, HashStream, ProgressNotifier } from '../../utils/streams';
import { ActionState } from '../../../api';
import { Events } from '..';
import Errors from '../download/errors';
import { UploadProgressCallback } from '.';
import { logger } from '../../utils/logger';
import { uploadParts } from './multipart';
import { AppDetails } from '@internxt/sdk/dist/shared';

function putStream(url: string, fileSize?: number): Writable {
  const formattedUrl = new URL(url);
  let headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
  };

  if (fileSize) {
    headers = { ...headers, 'Content-Length': fileSize.toString() };
  }

  return undiciPipeline(formattedUrl, { headers, method: 'PUT' }, (data) => data.body);
}

export function uploadFileV2(
  fileSize: number,
  source: Readable,
  bucketId: string,
  mnemonic: string,
  bridgeUrl: string,
  creds: { pass: string; user: string },
  appDetails: AppDetails,
  notifyProgress: UploadProgressCallback,
  actionState: ActionState,
): Promise<string> {
  const abortController = new AbortController();

  actionState.once(Events.Upload.Abort, () => {
    abortController.abort();
  });

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

  let cipher: Cipheriv;
  const progress = new ProgressNotifier(fileSize, 2000, { emitClose: false });

  progress.on(ProgressEvents.Progress, (progress: number) => {
    notifyProgress(progress, null, null);
  });

  return uploadFile(
    network,
    {
      validateMnemonic: (mnemonic: string) => {
        return validateMnemonic(mnemonic);
      },
      algorithm: ALGORITHMS.AES256CTR,
      generateFileKey: (mnemonic, bucketId, index) => {
        return GenerateFileKey(mnemonic, bucketId, index as Buffer);
      },
      randomBytes,
    },
    bucketId,
    mnemonic,
    fileSize,
    async (algorithm, key, iv) => {
      logger.debug('Encrypting file using %s (key %s, iv %s)...', algorithm, key.toString('hex'), iv.toString('hex'));

      if (algorithm !== ALGORITHMS.AES256CTR.type) {
        throw Errors.uploadUnknownAlgorithmError;
      }

      cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
    },
    async (url: string) => {
      logger.debug('Uploading file to %s...', url);

      const hasher = new HashStream();

      await pipeline(source, cipher, hasher, progress, putStream(url, fileSize), {
        signal: abortController.signal,
      });

      const fileHash = hasher.getHash().toString('hex');

      logger.debug('File uploaded (hash %s)', fileHash);

      return fileHash;
    },
  );
}

export function uploadFileMultipart(
  fileSize: number,
  source: Readable,
  bucketId: string,
  mnemonic: string,
  bridgeUrl: string,
  creds: { pass: string; user: string },
  notifyProgress: UploadProgressCallback,
  actionState: ActionState,
  appDetails: AppDetails,
): Promise<string> {
  const abortController = new AbortController();

  actionState.once(Events.Upload.Abort, () => {
    abortController.abort();
  });

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

  let cipher: Cipheriv;
  const progress = new ProgressNotifier(fileSize, 2000, { emitClose: false });
  const partSize = 15 * 1024 * 1024;
  const parts = Math.ceil(fileSize / partSize);

  progress.on(ProgressEvents.Progress, (progress: number) => {
    notifyProgress(progress, null, null);
  });

  return uploadMultipartFile(
    network,
    {
      validateMnemonic: (mnemonic: string) => {
        return validateMnemonic(mnemonic);
      },
      algorithm: ALGORITHMS.AES256CTR,
      generateFileKey: (mnemonic, bucketId, index) => {
        return GenerateFileKey(mnemonic, bucketId, index as Buffer);
      },
      randomBytes,
    },
    bucketId,
    mnemonic,
    fileSize,
    async (algorithm, key, iv) => {
      logger.debug('Encrypting file using %s (key %s, iv %s)...', algorithm, key.toString('hex'), iv.toString('hex'));

      if (algorithm !== ALGORITHMS.AES256CTR.type) {
        throw Errors.uploadUnknownAlgorithmError;
      }

      cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
    },
    async (urls) => {
      logger.debug('Uploading file to %s...', urls);

      const hasher = new HashStream();
      const pipelineToFinish = pipeline(source, cipher, hasher, progress, {
        signal: abortController.signal,
      });

      const parts = await uploadParts(urls, progress, abortController.signal);

      await pipelineToFinish;

      if (abortController.signal.aborted) {
        throw new Error('Process killed by user');
      }

      const fileHash = hasher.getHash().toString('hex');

      logger.debug('File uploaded (hash %s)', fileHash);

      return {
        hash: fileHash,
        parts,
      };
    },
    parts,
  );
}
