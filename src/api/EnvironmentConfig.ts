import { AppDetails } from '@internxt/sdk/dist/shared';

export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  appDetails: AppDetails;
  encryptionKey?: string;
  logLevel?: number;
  inject?: {
    fileEncryptionKey?: Buffer;
    index?: Buffer;
  };
}
