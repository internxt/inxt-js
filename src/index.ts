import Download from './lib/download'

interface OnlyErrorCallback {
  (err: Error | null): void
}
interface DownloadProgressCallback {
  (progress: number, downloadedBytes: number | null, totalBytes: number | null): void
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

  setEncryptionKey(newEncryptionKey: string): void {
    this.config.encryptionKey = newEncryptionKey
  }

  resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): void {
    Download(this.config, bucketId, fileId)

    if (options && options.progressCallback) {
      options.progressCallback(10, 10, 10)
    }

    return
  }
}

export interface EnvironmentConfig {
  bridgeUrl?: string
  bridgeUser: string
  bridgePass: string
  encryptionKey?: string
  logLevel?: number
  webProxy?: string
}