import { queue } from 'async';
import { logger } from '../../utils/logger';
import { request } from 'undici';
import { ProgressNotifier } from '../../utils/streams';

type Part = { PartNumber: number; ETag: string };

async function uploadPart(
  partUrl: string,
  partStream: { size: number; stream: Buffer; index: number },
  signal?: AbortSignal,
) {
  const { statusCode, headers, body } = await request(partUrl, {
    signal,
    body: partStream.stream,
    method: 'PUT',
    headers: {
      'Content-Length': partStream.size.toString(),
    },
  });

  if (statusCode === 200) {
    return headers.etag?.toString();
  }

  throw new Error(`Failed to upload part: ${statusCode} ${await body.text()}`);
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

  const uploadQueue = queue(async (part: PartUpload, callback) => {
    logger.debug('Uploading part %s of %s => %s bytes', part.source.index, partUrls.length, part.source.size);

    try {
      const etag = await uploadPart(part.url, part.source, signal);

      if (!etag) {
        throw new Error('ETag header was not returned');
      }
      parts.push({ PartNumber: part.source.index, ETag: etag });
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }, concurrency);

  for await (const chunk of progress) {
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

  if (bytesRead > 0) {
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

  while (uploadQueue.running() > 0 || uploadQueue.length() > 0) {
    await uploadQueue.drain();
  }

  return parts.sort((pA, pB) => pA.PartNumber - pB.PartNumber);
}
