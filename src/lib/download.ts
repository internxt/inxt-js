import { EnvironmentConfig } from '../index'
import { FileObject } from '../api/FileObject'
import { Readable, Transform } from 'stream'

export async function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<Readable> {
  if (!config.encryptionKey) {
    throw Error('Encryption key required')
  }

  const File = new FileObject(config, bucketId, fileId)
  await File.GetFileInfo()

  File.on('end', () => {
    console.log('FILE END')
  })

  // API request file mirrors with tokens
  await File.GetFileMirrors()

  let totalSize = File.final_length
  const t = new Transform({
    transform(chunk: Buffer, enc, cb) {
      if (chunk.length > totalSize) {
        cb(null, chunk.slice(0, totalSize))
      } else {
        totalSize -= chunk.length
        cb(null, chunk)
      }
    }
  })

  return File.StartDownloadFile().pipe(File.decipher).pipe(t)
}