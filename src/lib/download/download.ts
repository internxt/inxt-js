import { DownloadFileOptions, DownloadProgressCallback, EnvironmentConfig } from '../..'
import { FileObject } from '../../api/FileObject'
import { Readable, Transform } from 'stream'
import { FILEMUXER, DOWNLOAD, DECRYPT, FILEOBJECT } from '../events'
import { Mutex } from '../utils/mutex'

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

  out.on('error', (err) => { throw err })
  
  attachFileObjectListeners(File, out)
  handleDownloadProgress(File, options.progressCallback)

  return File.StartDownloadFile().pipe(File.decipher).pipe(out)
}

// TODO: use propagate lib
function attachFileObjectListeners(f: FileObject, notified: Transform) {
  // propagate events to notified
  f.on(FILEMUXER.PROGRESS, (msg) => notified.emit(FILEMUXER.PROGRESS, msg))

  // TODO: Handle filemuxer errors
  f.on(FILEMUXER.ERROR, (err) => notified.emit(FILEMUXER.ERROR, err))

  // TODO: Handle fileObject errors
  f.on('error', (err) => notified.emit(FILEOBJECT.ERROR, err))
  f.on('end', () => notified.emit(FILEOBJECT.END))
  
  f.decipher.on('end', () => notified.emit(DECRYPT.END))
  f.decipher.once('error', (err: Error) => notified.emit(DECRYPT.ERROR, err))
}

function handleDownloadProgress(fl: FileObject, cb: DownloadProgressCallback) {
  let totalBytesDownloaded = 0, totalBytesDecrypted = 0
  let progress = 0
  const totalBytes = fl.fileInfo ? fl.fileInfo.size : 0

  function getWeightedDownload() {
    const coefficient = 0.75
    return totalBytesDownloaded * coefficient
  }

  function getWeightedDecryption() {
    const coefficient = 0.25
    return totalBytesDecrypted * coefficient
  }

  function getBytesProcessed() {
    return getWeightedDecryption() + getWeightedDownload()
  }

  function getCurrentProgress() {
    return (getBytesProcessed() / totalBytes) * 100
  }

  const mutex = new Mutex()

  fl.on(DOWNLOAD.PROGRESS, async (addedBytes: number) => {
    await mutex.dispatch(() => {
      totalBytesDownloaded += addedBytes
      progress = getCurrentProgress()
      cb(progress, totalBytesDownloaded, totalBytes)
    })
  })

  fl.on(DECRYPT.PROGRESS, async (addedBytes: number) => {
    await mutex.dispatch(() => {
      totalBytesDecrypted += addedBytes
      progress = getCurrentProgress()
      cb(progress, totalBytesDownloaded, totalBytes)
    })
  })
}