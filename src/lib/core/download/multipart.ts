import { request } from 'undici';
import { createDecipheriv, randomBytes } from 'crypto';
import { Writable, Readable, PassThrough } from 'stream'
import { pipeline } from 'stream/promises'
import { validateMnemonic } from 'bip39';
import { ALGORITHMS, DecryptFileFunction, DownloadFileFunction, Network } from '@internxt/sdk/dist/network';
import { downloadFile, FileVersionOneError } from '@internxt/sdk/dist/network/download';

import { Events as ProgressEvents, HashStream, ProgressNotifier } from '../../utils/streams';
import { DownloadProgressCallback } from '.';
import { GenerateFileKey, sha256 } from '../../utils/crypto';
import Errors from './errors';

async function downloadPartStream(
  downloadUrl: string, 
  from: number, 
  to: number, 
  signal?: AbortSignal
): Promise<Readable> {
  const { statusCode, body } = await request(downloadUrl, {
    signal,
    method: 'GET',
    headers: {
      Range: `bytes=${from}-${to}`,
    }
  });

  if (statusCode !== 206) {
    throw new Error(`Error al descargar el chunk: ${statusCode}`);
  }

  return body;
}

export function downloadFileMultipart(
  fileId: string,
  fileSize: number,
  bucketId: string,
  mnemonic: string,
  bridgeUrl: string,
  creds: { pass: string, user: string },
  notifyProgress: DownloadProgressCallback,
  onV2Confirmed: () => void,
  signal?: AbortSignal
): [Promise<void>, PassThrough] {
  const partLength = 50 * 1024 * 1024;
  const outStream = new PassThrough();
  const network = Network.client(bridgeUrl, {
    clientName: 'inxt-js',
    clientVersion: '1.0'
  }, {
    bridgeUser: creds.user,
    userId: sha256(Buffer.from(creds.pass)).toString('hex')
  });

  let downloadUrl = ''

  const ranges: { start: number, end: number }[] = [];

  for (let start = 0; start < fileSize; start += partLength) {
    const end = Math.min(start + partLength - 1, fileSize - 1);
    ranges.push({ start, end });
  }


  const downloadFileStep: DownloadFileFunction = async (downloadables) => {
    onV2Confirmed();

    for (const downloadable of downloadables.sort((dA, dB) => dA.index - dB.index)) {
      downloadUrl = downloadable.url
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

    const hasher = new HashStream();

    const pipelinePromise = pipeline(
      hasher, 
      decipher, 
      progress, 
      outStream, 
      signal ? { signal } : undefined
    );

    for (const range of ranges) {
      const partStream = await downloadPartStream(downloadUrl, range.start, range.end, signal);
      for await (const chunk of partStream) {
        if (!hasher.write(chunk)) {
          await new Promise((resolve) => hasher.once('drain', resolve));
        }
      }
    }

    hasher.end();

    await pipelinePromise;
    
    // TODO: Enforce this one
    // const calculatedHash = hasher.getHash().toString('hex');
    // const expectedHash = fileEncryptedSlice.hash;

    // if (calculatedHash !== expectedHash) {
    //   throw Errors.downloadHashMismatchError; 
    // }

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
      }
    }, 
    Buffer.from, 
    downloadFileStep, 
    decryptFileStep
  ).catch((err) => {
    if (err instanceof FileVersionOneError) {
      throw err;
    } 
    outStream.emit('error', err);
  });

  return [downloadPromise, outStream];
}
