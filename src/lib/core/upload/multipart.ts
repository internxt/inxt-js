import { queue } from 'async';
import { logger } from '../../utils/logger';
import { request } from 'undici';
import { ProgressNotifier } from '../../utils/streams';

type Part = { PartNumber: number; ETag: string };

async function uploadPart(
  partUrl: string,
  partStream: { size: number; stream: Buffer; index: number },
  signal?: AbortSignal,
): Promise<string | undefined> {
  const { statusCode, headers, body } = await request(partUrl, {
    signal,
    body: partStream.stream,
    method: 'PUT',
    headers: {
      'Content-Length': partStream.size.toString(),
    },
  });

  if (statusCode !== 200) {
    throw new Error(`Failed to upload part: ${statusCode} ${await body.text()}`);
  }

  await body.dump();
  return headers.etag?.toString();
}

interface PartUpload {
  url: string;
  source: { size: number; stream: Buffer; index: number };
}

export async function uploadParts(
  partUrls: string[],
  progress: ProgressNotifier,
  signal?: AbortSignal,
): Promise<Part[]> {
  const parts: Part[] = [];
  const concurrency = 10;

  const partLength = 15 * 1024 * 1024;
  let bytesRead = 0;
  let partNumber = 1;
  let partChunks: Buffer[] = [];
  let uploadPartError: Error | null = null;

  const uploadQueue = queue(async (part: PartUpload) => {
    logger.debug('Uploading part %s of %s => %s bytes', part.source.index, partUrls.length, part.source.size);
    const etag = await uploadPart(part.url, part.source, signal);

    if (!etag) {
      throw new Error('ETag header was not returned');
    }
    parts.push({ PartNumber: part.source.index, ETag: etag });
  }, concurrency);

  uploadQueue.error((err) => {
    uploadPartError = err;
  });

  for await (const chunk of progress) {
    if (uploadPartError) throw uploadPartError;
    bytesRead += chunk.length;
    partChunks.push(chunk);

    while (uploadQueue.running() >= concurrency) {
      await uploadQueue.unsaturated();
    }

    while (bytesRead >= partLength) {
      const partBuffer = Buffer.concat(partChunks);
      const slice = partBuffer.subarray(0, partLength);
      uploadQueue.push({
        url: partUrls[partNumber - 1],
        source: {
          size: slice.length,
          stream: slice,
          index: partNumber,
        },
      });

      partChunks = [partBuffer.subarray(partLength)];
      bytesRead -= partLength;
      partNumber += 1;
    }
  }

  if (bytesRead > 0 && !uploadPartError) {
    const partBuffer = Buffer.concat(partChunks);
    uploadQueue.push({
      url: partUrls[partNumber - 1],
      source: {
        size: partBuffer.length,
        stream: partBuffer,
        index: partNumber,
      },
    });
  }

  while (!uploadPartError && (uploadQueue.running() > 0 || uploadQueue.length() > 0)) {
    await uploadQueue.drain();
  }

  if (uploadPartError) {
    throw uploadPartError;
  }

  return parts.sort((pA, pB) => pA.PartNumber - pB.PartNumber);
}
