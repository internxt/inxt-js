import { Cipheriv, createCipheriv, randomBytes } from 'crypto';
import { PassThrough, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { request } from 'undici';
import { validateMnemonic } from 'bip39';

import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { ALGORITHMS, Crypto, Network } from '@internxt/sdk/dist/network';

import { GenerateFileKey, sha256 } from '../../utils/crypto';
import { Events as ProgressEvents, HashStream, ProgressNotifier } from '../../utils/streams';
import { UploadProgressCallback } from '.';
import { logger } from '../../utils/logger';
import { uploadParts } from './multipart';
import { AppDetails } from '@internxt/sdk/dist/shared';

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

const crypto: Crypto = {
  validateMnemonic: (mnemonic: string) => {
    return validateMnemonic(mnemonic);
  },
  algorithm: ALGORITHMS.AES256CTR,
  generateFileKey: (mnemonic, bucketId, index) => {
    return GenerateFileKey(mnemonic, bucketId, index as Buffer);
  },
  randomBytes,
};

async function putFile(url: string, body: Readable, fileSize: number, signal?: AbortSignal): Promise<void> {
  const { statusCode, body: responseBody } = await request(url, {
    signal,
    body,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize.toString(),
    },
  });

  if (statusCode !== 200) {
    throw new Error(`Failed to upload file: ${statusCode} ${await responseBody.text()}`);
  }

  await responseBody.dump();
}

async function uploadFileV2(
  network: Network,
  fileSize: number,
  source: Readable,
  bucketId: string,
  mnemonic: string,
  progress: ProgressNotifier,
  abortSignal?: AbortSignal,
): Promise<string> {
  let cipher: Cipheriv;

  return await uploadFile(
    network,
    crypto,
    bucketId,
    mnemonic,
    fileSize,
    async (algorithm, key, iv) => {
      logger.debug('Encrypting file using %s (key %s, iv %s)...', algorithm, key.toString('hex'), iv.toString('hex'));

      if (algorithm !== ALGORITHMS.AES256CTR.type) {
        throw new Error(`Invalid algorithm: ${algorithm}.`);
      }

      cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
    },
    async (url) => {
      logger.debug('Uploading file to %s...', url);

      const hasher = new HashStream();
      const relayStream = new PassThrough();

      const putFilePromise = putFile(url, relayStream, fileSize, abortSignal);
      const pipelinePromise = pipeline(source, cipher, hasher, progress, relayStream, {
        signal: abortSignal,
      });

      await Promise.all([pipelinePromise, putFilePromise]);

      const fileHash = hasher.getHash().toString('hex');

      logger.debug('File uploaded (hash %s)', fileHash);

      return fileHash;
    },
    abortSignal,
  );
}

async function uploadFileMultipart(
  network: Network,
  fileSize: number,
  source: Readable,
  bucketId: string,
  mnemonic: string,
  progress: ProgressNotifier,
  abortSignal?: AbortSignal,
): Promise<string> {
  let cipher: Cipheriv;
  const partSize = 15 * 1024 * 1024;
  const parts = Math.ceil(fileSize / partSize);

  return await uploadMultipartFile(
    network,
    crypto,
    bucketId,
    mnemonic,
    fileSize,
    async (algorithm, key, iv) => {
      logger.debug('Encrypting file using %s (key %s, iv %s)...', algorithm, key.toString('hex'), iv.toString('hex'));

      if (algorithm !== ALGORITHMS.AES256CTR.type) {
        throw new Error(`Invalid algorithm: ${algorithm}.`);
      }

      cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
    },
    async (urls) => {
      logger.debug('Uploading file to %s...', urls);

      const hasher = new HashStream();
      const pipelineToFinish = pipeline(source, cipher, hasher, progress, {
        signal: abortSignal,
      });

      const parts = await uploadParts(urls, progress, abortSignal);

      await pipelineToFinish;

      const fileHash = hasher.getHash().toString('hex');

      logger.debug('File uploaded (hash %s)', fileHash);

      return {
        hash: fileHash,
        parts,
      };
    },
    abortSignal,
    parts,
  );
}

export async function upload(
  fileSize: number,
  source: Readable,
  bucketId: string,
  mnemonic: string,
  bridgeUrl: string,
  creds: { pass: string; user: string },
  appDetails: AppDetails,
  notifyProgress: UploadProgressCallback,
  abortSignal?: AbortSignal,
): Promise<string> {
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

  const progress = new ProgressNotifier(fileSize, 2000, { emitClose: false });

  progress.on(ProgressEvents.Progress, (progress: number) => {
    notifyProgress(progress, null, null);
  });

  if (fileSize > MULTIPART_THRESHOLD) {
    return await uploadFileMultipart(network, fileSize, source, bucketId, mnemonic, progress, abortSignal);
  }

  return await uploadFileV2(network, fileSize, source, bucketId, mnemonic, progress, abortSignal);
}
