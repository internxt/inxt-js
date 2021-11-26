export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  download?: {
    concurrency: number;
    useProxy: boolean
  }
  inject?: {
    fileEncryptionKey?: Buffer,
    index?: Buffer;
  }
}
