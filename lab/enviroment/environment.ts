import { Readable } from 'stream'

import { DownloadFileOptions, Environment, UploadFinishCallback, UploadProgressCallback } from "../../src"
import { FileMeta } from "../../src/api/FileObjectUpload"
import { EncryptFilename } from "../../src/lib/crypto"
import { Download } from "../../src/lib/download"
import { Upload } from "../../src/lib/upload"
import { logger } from '../../src/lib/utils/logger'
import { ShardFailedIntegrityCheckError, ShardSuccesfulIntegrityCheck } from '../../src/lib/filemuxer'

export class LabEnvironment extends Environment {
    /**
     * Uploads a file
     * @param bucketId Bucket id where file is
     * @param file file metadata required for performing the upload
     * @param progress Progress callback
     * @param finish Finish callback
     */
    upload(bucketId: string, file: FileMeta, progress: UploadProgressCallback, finish: UploadFinishCallback) : void {
        if(!this.config.encryptionKey) {
            throw new Error('Mnemonic was not provided')   
        }

        EncryptFilename(this.config.encryptionKey, bucketId, file.name).then((name: string) => {
            Upload(this.config, bucketId, {...file, name}, progress, finish)
        })
    }

    /**
     * Downloads a file
     * @param bucketId Bucket id where file is
     * @param fileId Id of the file to be downloaded
     * @param options Available options for download
     */
    async download(bucketId: string, fileId: string, options: DownloadFileOptions) : Promise<Readable> {
        if(!this.config.encryptionKey) {
            throw new Error('Mnemonic was not provided')
        }

        const output = await Download(this.config, bucketId, fileId, options)

        handleLogsFrom(output)

        return output
    }
}

function handleLogsFrom(output: Readable) {
    output.on('error', (err: Error) => {
        logger.error('Download failed due to %s', err.message)
        console.error(err)
    })

    handleDownloadLogs(output)
    handleDecryptingLogs(output)

    output.on('end', () => logger.info('Download complete.'))
}

function handleDownloadLogs(output: Readable) {
    output.on('download-finished', () => logger.info('Shards download finished. Decrypting...'))

    output.on('download-filemuxer-error', (err: ShardFailedIntegrityCheckError) => {
        logger.error('%s. Expected hash: %s, actual: %s', err.message, err.content.expectedHash, err.content.actualHash)
    })

    output.on('download-filemuxer-success', (msg: ShardSuccesfulIntegrityCheck) => {
        logger.debug('digest %s', msg.content.digest)
        logger.info('shard %s OK', msg.content.expectedHash)
    })
}

function handleDecryptingLogs(output: Readable) {
    output.on('decrypting-finished', () => logger.info('Decrypting finished.'))
}
