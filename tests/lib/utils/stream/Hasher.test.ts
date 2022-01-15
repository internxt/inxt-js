import { Readable } from 'stream';
import { randomBytes, createHash } from 'crypto';

import { HashStream } from '../../../../src/lib/utils/streams/Hasher';

function ripemd160(content: Buffer) {
  return createHash('ripemd160').update(content).digest();
}

function sha256(content: Buffer) {
  return createHash('sha256').update(content).digest();
}

const defaultHighWatermark = 16 * 1024;

describe('HashStream tests', () => {
  describe('Hash properly', () => {
    it('Should hash properly when content size < highWatermark', async () => {
      // Default watermark is 16KB for streams
      const hasher = new HashStream();
      const content = randomBytes(defaultHighWatermark - 1);
      const contentStream = Readable.from(content);

      await new Promise((resolve, reject) => {
        contentStream.pipe(hasher)
          .on('data', () => {})
          .on('error', reject)
          .on('end', resolve);
      });

      const received = hasher.getHash();
      const expected = ripemd160(sha256(content));
      
      expect(received).toEqual(expected);
    });

    it('Should hash properly when content size = highWatermark', async () => {
      // Default watermark is 16KB for streams
      const hasher = new HashStream();
      const content = randomBytes(defaultHighWatermark);
      const contentStream = Readable.from(content);

      await new Promise((resolve, reject) => {
        contentStream.pipe(hasher)
          .on('data', () => {})
          .on('error', reject)
          .on('end', resolve);
      });

      const received = hasher.getHash();
      const expected = ripemd160(sha256(content));
      
      expect(received).toEqual(expected);
    });

    it('Should hash properly when chunk size > highWatermark', async () => {
      // Default watermark is 16KB for streams
      const hasher = new HashStream();
      const content = randomBytes(defaultHighWatermark + 1);
      const contentStream = Readable.from(content);

      await new Promise((resolve, reject) => {
        contentStream.pipe(hasher)
          .on('data', () => {})
          .on('error', reject)
          .on('end', resolve);
      });

      const received = hasher.getHash();
      const expected = ripemd160(sha256(content));
      
      expect(received).toEqual(expected);
    });
  });
});
