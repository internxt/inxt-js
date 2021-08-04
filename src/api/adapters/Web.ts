import { Readable } from "stream";
import streamToBlob from "stream-to-blob";
import { DecryptionProgressCallback, DownloadFileOptions, DownloadProgressCallback } from "../..";

export type WebDownloadFinishedCallback = (err: Error | null, file: Blob | null) => void;

export interface WebDownloadFileOptions {
  fileToken?: string;
  fileEncryptionKey?: Buffer;
  progressCallback: DownloadProgressCallback;
  decryptionProgressCallback?: DecryptionProgressCallback;
  finishedCallback: WebDownloadFinishedCallback;
}

export function adapt(options: WebDownloadFileOptions): DownloadFileOptions {
  return {
    ...options,
    finishedCallback: (err: Error | null, downloadStream: Readable | null) => {
      if (err) {
        return options.finishedCallback(err, null);
      }
      if (!downloadStream) {
        return options.finishedCallback(Error('Empty download stream'), null);
      }
      streamToBlob(downloadStream, 'application/octet-stream').then((blob) => {
        options.finishedCallback(null, blob);
      });
    }
  };
}
