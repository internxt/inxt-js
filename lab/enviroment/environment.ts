import { Readable } from 'stream'

import { DownloadFileOptions, Environment, UploadFinishCallback, UploadProgressCallback } from "../../src"
import { FileMeta } from "../../src/api/FileObjectUpload"
import { EncryptFilename } from "../../src/lib/crypto"
import { Download } from "../../src/lib/download"
import { Upload } from "../../src/lib/upload"

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
    download(bucketId: string, fileId: string, options: DownloadFileOptions) : Promise<Readable> {
        if(!this.config.encryptionKey) {
            throw new Error('Mnemonic was not provided')
        }

        return Download(this.config, bucketId, fileId, options)
    }
}
