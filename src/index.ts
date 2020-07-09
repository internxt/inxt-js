import Download from './lib/download'

interface OnlyErrorCallback {
  (err: Error | null): void
}
interface DownloadProgressCallback {
  (progress: Number, downloadedBytes: Number | null, totalBytes: Number | null): void
}
export interface ResolveFileOptions {
  progressCallback: DownloadProgressCallback,
  finishedCallback: OnlyErrorCallback,
  overwritte?: boolean
}
export class Environment {
  private config: EnvironmentConfig

  constructor(config: EnvironmentConfig) {
    this.config = config
  }

  setEncryptionKey(newEncryptionKey: string) {
    this.config.encryptionKey = newEncryptionKey
  }

  resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions) {
    const downloader = Download(this.config, bucketId, fileId)
  }
}

export interface EnvironmentConfig {
  bridgeUrl?: string
  bridgeUser: string
  bridgePass: string
  encryptionKey?: string
  logLevel?: number
}