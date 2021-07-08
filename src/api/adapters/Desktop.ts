import { Readable } from "stream";

import { DecryptionProgressCallback, DownloadFileOptions, DownloadFinishedCallback, DownloadProgressCallback } from "../..";
import { logger } from "../../lib/utils/logger";
import { DOWNLOAD_CANCELLED } from "../constants";

export type DesktopDownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;

export interface DesktopDownloadFileOptions {
    progressCallback: DownloadProgressCallback;
    decryptionProgressCallback?: DecryptionProgressCallback;
    finishedCallback: DesktopDownloadFinishedCallback;
}

export interface DesktopUploadFileOptions {
    // TODO
}

/**
 * Adapts Desktop download options to std file download options
 * @param options Desktop download file options
 * @returns adapted options to std file download options
 */
export const DownloadOptionsAdapter = (options: DesktopDownloadFileOptions): DownloadFileOptions => {
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

        options.finishedCallback(err, fileStream);
    }

    return {
        progressCallback: options.progressCallback,
        decryptionProgressCallback: options.decryptionProgressCallback,
        finishedCallback: downloadFinishedCallback
    }
}

export const UploadOptionsAdapter = (options: DesktopUploadFileOptions): void => {
    // TODO
}