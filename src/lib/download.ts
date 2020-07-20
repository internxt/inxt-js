import { EnvironmentConfig } from '../index'
import { FileObject } from '../api/FileObject'
import DecryptStream from './decryptstream'

export default async function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<DecryptStream> {
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

  return File.StartDownloadFile()
}