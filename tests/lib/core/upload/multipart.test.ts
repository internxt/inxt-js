import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Readable } from 'stream';
import { request } from 'undici';
import { uploadParts } from '../../../../src/lib/core/upload/multipart';
import { ProgressNotifier } from '../../../../src/lib/utils/streams/ProgressNotifier';

vi.mock('undici');

const mockRequest = vi.mocked(request);

function makeProgress(): ProgressNotifier {
  const progress = new ProgressNotifier(1024);
  Readable.from(Buffer.alloc(1024, 'a')).pipe(progress);
  return progress;
}

describe('multipart', () => {
  const partUrls = ['http://fake-s3.com/part-1'];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('uploadParts', () => {
    it('should return all parts sorted by PartNumber when upload succeeds', async () => {
      const etag = '"etag-1"';
      mockRequest.mockResolvedValue({
        statusCode: 200,
        headers: { etag },
        body: { dump: vi.fn().mockResolvedValue(undefined) },
      } as unknown as Awaited<ReturnType<typeof request>>);

      const parts = await uploadParts(partUrls, makeProgress(), new AbortController().signal);

      expect(parts).toStrictEqual([{ PartNumber: 1, ETag: etag }]);
    });

    it('should throw when a part fails to upload', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 500,
        headers: {},
        body: { text: vi.fn().mockResolvedValue('Internal Server Error') },
      } as unknown as Awaited<ReturnType<typeof request>>);

      await expect(uploadParts(partUrls, makeProgress(), new AbortController().signal)).rejects.toThrow(
        'Failed to upload part: 500',
      );
    });
  });
});
