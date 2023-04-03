import https from 'https'
import { queue } from 'async'
import { Readable } from 'stream'

type Part = { PartNumber: number, ETag: string };

async function uploadPart(partUrl: string, partStream: { size: number, stream: Buffer, index: number }) {
  console.log('partStream', partStream);

  return new Promise((resolve: (etag: string | undefined) => void, reject) => {
    const options = {
      method: 'PUT',
      headers: {
        'Content-Length': partStream.size,
      },
    };
    const req = https.request(partUrl, options, (res) => {
      if (res.statusCode === 200) {
        resolve(res.headers.etag);
      } else {
        reject(new Error(`Failed to upload part: ${res.statusCode} ${res.statusMessage}`));
      }
    });
    Readable.from(partStream.stream).pipe(req);
    req.on('error', (err) => {
      reject(new Error(`Failed to upload part: ${err.message}`));
    });
  });
}

interface PartUpload {
  url: string;
  source: { size: number, stream: Buffer, index: number };
}

export async function uploadParts(partUrls: string[], stream: Readable) {
  const parts: { PartNumber: number; ETag: string }[] = [];

  const partLength = 30 * 1024 * 1024;
  let bytesRead = 0;
  let partNumber = 1;
  let partBuffer = Buffer.alloc(0);

  const uploadQueue = queue(async (part: PartUpload, callback) => {
    console.log('Uploading part', part.source.index, 'of', partUrls.length, '...');
    try {
      const etag = await uploadPart(part.url, part.source);

      if (!etag) {
        throw new Error('ETag header was not returned');
      }
      parts.push({ PartNumber: part.source.index, ETag: etag });
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }, 6);

  for await (const chunk of stream) {
    bytesRead += chunk.length;
    partBuffer = Buffer.concat([partBuffer, chunk]);

    if (uploadQueue.running() === 6) {
      await uploadQueue.unsaturated();
    }

    while (bytesRead >= partLength) {
      const slice = partBuffer.slice(0, partLength);
      uploadQueue.push({
        url: partUrls[partNumber - 1],
        source: {
          size: slice.length,
          stream: slice,
          index: partNumber,
        },
      });

      partBuffer = partBuffer.slice(partLength);
      bytesRead -= partLength;
      partNumber += 1;
    }
  }

  if (bytesRead > 0) {
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

  console.log('parts', parts);

  return parts.sort((pA, pB) => pA.PartNumber - pB.PartNumber);
}
