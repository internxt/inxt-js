import { DownloadFileOptions, EnvironmentConfig } from '../..'
import { FileObject } from '../../api/FileObject'
import { Readable, Transform } from 'stream'

export async function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Readable> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required')
  }

  const File = new FileObject(config, bucketId, fileId)
  await File.GetFileInfo()

  // API request file mirrors with tokens
  await File.GetFileMirrors()

  let totalSize = File.final_length
  const out = new Transform({
    transform(chunk: Buffer, enc, cb) {
      if (chunk.length > totalSize) {
        cb(null, chunk.slice(0, totalSize))
      } else {
        totalSize -= chunk.length
        cb(null, chunk)
      }
    }
  })

  // If an error occurs, the download ends
  out.on('error', (err: Error | null | undefined) => out.emit('end', err))

  // Propagate events to the output stream
  File.on('download-filemuxer-success', (msg) => out.emit('download-filemuxer-success', msg))
  File.on('download-filemuxer-error', (err) => out.emit('download-filemuxer-error', err))
  File.on('end', () => out.emit('download-finished'))
  File.on('error', (err) => out.emit('error', err))

  File.decipher.on('end', () => out.emit('decrypting-finished'))
  File.decipher.once('error', (err: Error) => out.emit('error', err))
  File.decipher.on('decrypting-progress', () => {
    console.log('decrypting progress!')
    // must recalculate 25% of the progress?
  })

  let downloadedBytes = 0
  let progress = 0
  const totalBytes = File.fileInfo ? File.fileInfo.size : 0

  File.on('download-progress', (addedBytes: number) => {
    downloadedBytes += addedBytes
    progress = (downloadedBytes / totalBytes) * 100
    options.progressCallback(progress, downloadedBytes, totalBytes)
    // must recalculate 75% of the progress?
  })

  return File.StartDownloadFile().pipe(File.decipher).pipe(out)
}