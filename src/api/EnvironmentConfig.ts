export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  webProxy?: string;
  useProxy?: boolean;
  download?: {
    concurrency: number;
  }
  inject?: {
    fileEncryptionKey?: Buffer,
    index?: Buffer;
  }
  upload?: {
    concurrency: number;
  }
}
