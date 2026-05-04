import { Readable } from 'stream';

export * from './strategy';

export type UploadProgressCallback = (
  progress: number,
  uploadedBytes: number | null,
  totalBytes: number | null,
) => void;
type EncryptProgressCallback = (progress: number) => void;

export interface UploadOptions {
  progressCallback: UploadProgressCallback;
  encryptProgressCallback?: EncryptProgressCallback;
  fileSize: number;
  source: Readable;
  abortSignal?: AbortSignal;
}
