import { Readable } from 'stream'

import { DownloadFileOptions, Environment, UploadFinishCallback, UploadProgressCallback } from "../../src"
import { FileMeta } from "../../src/api/FileObjectUpload"
import { EncryptFilename } from "../../src/lib/crypto"
import { Download } from "../../src/lib/download"
import { Upload } from "../../src/lib/upload"
import { logger } from '../../src/lib/utils/logger'
import { ShardFailedIntegrityCheckError, ShardSuccesfulIntegrityCheck } from '../../src/lib/filemuxer'
import { DECRYPT, DOWNLOAD, FILEMUXER } from '../../src/lib/events'

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

        // handleLogsFrom(output)
        new DownloadLogsManager(output).init()

        return output
    }
}

class DownloadLogsManager {
    private output: Readable

    constructor(output: Readable) {
        this.output = output
    }

    init() {
        this.addFileMuxerListeners()
        this.addDownloadListeners()
        this.addDecryptListeners()

        this.output.on('error', (err) => {
            logger.error('Download failed due to %s', err.message)
            console.error(err)
        })

        this.output.on('end', () => {
            logger.info('Download complete.')
        })
    }

    private addFileMuxerListeners() {
        this.output.on(FILEMUXER.ERROR, (err: ShardFailedIntegrityCheckError) => {
            logger.error('%s. Expected hash: %s, actual: %s', err.message, err.content.expectedHash, err.content.actualHash)
        })
    
        this.output.on(FILEMUXER.PROGRESS, (msg: ShardSuccesfulIntegrityCheck) => {
            logger.debug('digest %s', msg.content.digest)
            logger.info('shard %s OK', msg.content.expectedHash)
        })
    }

    private addDownloadListeners() {        
        this.output.on(DOWNLOAD.PROGRESS, () => {
            logger.info('Download progress fired!')
        })

        this.output.on(DOWNLOAD.END, () => {
            logger.info('Shards download finished. Decrypting...')
        })
    }

    private addDecryptListeners() {
        this.output.on(DECRYPT.PROGRESS, () => {
            logger.info('Decrypting progress fired!')
        })

        this.output.on(DECRYPT.END, () => {
            logger.info('Decrypting finished.')
        })
    }
}

// function handleLogsFrom(output: Readable) {
//     handleDownloadLogs(output)
//     handleDecryptingLogs(output)

//     output.on('error', (err: Error) => {
//         logger.error('Download failed due to %s', err.message)
//         console.error(err)
//     })

//     output.on('end', () => logger.info('Download complete.'))
// }

// function handleDownloadLogs(output: Readable) {
//     output.on(DOWNLOAD.END, () => logger.info('Shards download finished. Decrypting...'))

//     output.on(FILEMUXER.ERROR, (err: ShardFailedIntegrityCheckError) => {
//         logger.error('%s. Expected hash: %s, actual: %s', err.message, err.content.expectedHash, err.content.actualHash)
//     })

//     output.on(FILEMUXER.PROGRESS, (msg: ShardSuccesfulIntegrityCheck) => {
//         logger.debug('digest %s', msg.content.digest)
//         logger.info('shard %s OK', msg.content.expectedHash)
//     })
// }

// function handleDecryptingLogs(output: Readable) {
//     output.on(DECRYPT.PROGRESS, () => logger.info('Decrypting progress'))
//     output.on(DECRYPT.END, () => logger.info('Decrypting finished.'))
// }
