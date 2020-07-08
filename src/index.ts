import Download from './lib/download'

export class Environment {
  private config: EnvironmentConfig

  constructor(config: EnvironmentConfig) {
    this.config = config
  }

  setEncryptionKey(newEncryptionKey: string) {
    this.config.encryptionKey = newEncryptionKey
  }

  download(bucketId: string, fileId: string) {
    return Download(this.config, bucketId, fileId)
  }
}

