import https from 'https'
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


export async function uploadParts(partUrls: string[], stream: Readable) {
  const parts: { PartNumber: number; ETag: string }[] = [];

  const partLength = 30 * 1024 * 1024;
  let bytesRead = 0;
  let partNumber = 1;
  let partBuffer = Buffer.alloc(0);

  for await (const chunk of stream) {
    bytesRead += chunk.length;
    partBuffer = Buffer.concat([partBuffer, chunk]);

    while (bytesRead >= partLength) {
      const slice = partBuffer.slice(0, partLength);
      const etag = await uploadPart(partUrls[partNumber - 1], {
        size: slice.length,
        stream: slice,
        index: partNumber,
      });
      if (!etag) {
        throw new Error('ETag header was not returned');
      }
      parts.push({ PartNumber: partNumber, ETag: etag });

      partBuffer = partBuffer.slice(partLength);
      bytesRead -= partLength;
      partNumber += 1;
    }
  }

  if (bytesRead > 0) {
    const etag = await uploadPart(partUrls[partNumber - 1], {
      size: partBuffer.length,
      stream: partBuffer,
      index: partNumber,
    });
    if (!etag) {
      throw new Error('ETag header was not returned');
    }
    parts.push({ PartNumber: partNumber, ETag: etag });
  }

  console.log('parts', parts);

  return parts.sort((pA, pB) => pA.PartNumber - pB.PartNumber);
}
