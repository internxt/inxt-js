import { Cipher, createCipheriv, randomBytes } from 'crypto';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { validateMnemonic } from 'bip39';

import { uploadFile } from '@internxt/sdk/dist/network/upload';
import { ALGORITHMS, Network } from '@internxt/sdk/dist/network';

import { GenerateFileKey, sha256 } from '../../utils/crypto';
import { Events as ProgressEvents, HashStream, ProgressNotifier } from '../../utils/streams';
import { ActionState } from '../../../api';
import { Events } from '..';
import Errors from '../download/errors';
import { UploadProgressCallback } from '.';
import { logger } from '../../utils/logger';

function putStream(url: string): Writable {
  const formattedUrl = new URL(url);
  const request = formattedUrl.protocol === 'http:' ? httpRequest : httpsRequest;

  return request({
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    hostname: formattedUrl.hostname,
    port: formattedUrl.port,
    protocol: formattedUrl.protocol,
    path: formattedUrl.pathname + '?' + formattedUrl.searchParams.toString(),
    method: 'PUT',
  });
}

export function uploadFileV2(
  fileSize: number,
  source: Readable,
  bucketId: string,
  mnemonic: string,
  bridgeUrl: string,
  creds: { pass: string, user: string },
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
      clientName: 'inxt-js',
      clientVersion: '1.0'
    },
    {
      bridgeUser: creds.user,
      userId: sha256(Buffer.from(creds.pass)).toString('hex')
    }
  );

  let cipher: Cipher;
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
      randomBytes
    },
    bucketId,
    mnemonic,
    fileSize,
    async (algorithm, key, iv) => {
      logger.debug('Encrypting file using %s (key %s, iv %s)...', algorithm, key.toString('hex'), iv.toString('hex'));

      if (algorithm !== ALGORITHMS.AES256CTR.type) {
        throw Errors.uploadUnknownAlgorithmError;
      }

      cipher = createCipheriv('aes-256-ctr', (key as Buffer), (iv as Buffer));
    },
    async (url: string) => {
      logger.debug('Uploading file to %s...', url);

      const hasher = new HashStream();

      await pipeline(source, cipher, hasher, progress, putStream(url), {
        signal: abortController.signal
      });

      const fileHash = hasher.getHash().toString('hex');

      logger.debug('File uploaded (hash %s)', fileHash);

      return fileHash;
    }
  );
}