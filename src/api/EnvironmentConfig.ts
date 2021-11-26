export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  inject?: {
    fileEncryptionKey?: Buffer;
    index?: Buffer;
  };
}
