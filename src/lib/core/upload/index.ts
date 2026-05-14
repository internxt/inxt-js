import { Readable } from 'stream';

export * from './strategy';

export type UploadProgressCallback = (
  progress: number,
  uploadedBytes: number | null,
  totalBytes: number | null,
) => void;

export interface UploadOptions {
  progressCallback: UploadProgressCallback;
  fileSize: number;
  source: Readable;
  abortSignal?: AbortSignal;
}
