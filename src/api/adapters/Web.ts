import { Readable } from "stream";
import streamToBlob from "stream-to-blob";

import { DecryptionProgressCallback, DownloadFileOptions, DownloadFinishedCallback, DownloadProgressCallback } from "../..";
import { logger } from "../../lib/utils/logger";
import { DOWNLOAD_CANCELLED } from "../constants";

export type WebDownloadFinishedCallback = (err: Error | null, file: Blob | null) => void;

export interface WebDownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: WebDownloadFinishedCallback;
}

export interface WebUploadFileOptions {
    // TODO
}

/**
 * Adapts web download options to std file download options
 * @param options web download file options
 * @returns adapted options to std file download options
 */
export const DownloadOptionsAdapter = (options: WebDownloadFileOptions): DownloadFileOptions => {
    const downloadFinishedCallback: DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => {
        if (err) {
            if (err.message === DOWNLOAD_CANCELLED) {
                logger.info('Download cancelled');

                return options.finishedCallback(null, null);
            }
            logger.error('Error downloading file due to %s', err.message);
            logger.error(err);

            return options.finishedCallback(err, null);
        }

        if (!fileStream) {
            return options.finishedCallback(Error('File stream is null'), null);
        }

        streamToBlob(fileStream, 'application/octet-stream').then((blob) => {
            options.finishedCallback(null, blob);
        }).catch((blobParsingErr) => {
            options.finishedCallback(blobParsingErr, null);
        });
    };

    return {
        progressCallback: options.progressCallback,
        decryptionProgressCallback: options.decryptionProgressCallback,
        finishedCallback: downloadFinishedCallback
    };
};

export const UploadOptionsAdapter = (options: WebUploadFileOptions): void => {
    // TODO
};
