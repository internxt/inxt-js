import { EnvironmentConfig } from '../api';
import { INXTRequest, Methods } from '../lib';

export interface CreateFileTokenResponse {
  token: string;
}
export type GetDownloadLinksResponse = { fileId: string; link: string; index: string }[];

class EmptyBridgeUrlError extends Error {
  constructor() {
    super('Empty bridge url');
  }
}

export class Bridge {
  protected config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    if (config.bridgeUrl === '') {
      throw new EmptyBridgeUrlError();
    }
    this.config = config;
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    const targetUrl = `${this.config.bridgeUrl}/buckets/${bucketId}/tokens`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: { operation, file: fileId } }, false);
  }

  getDownloadLinks(bucketId: string, fileIds: string[]) {
    const targetUrl = `${this.config.bridgeUrl}/buckets/${bucketId}/bulk-files?fileIds=${fileIds.join(',')}`;

    return new INXTRequest(this.config, Methods.Get, targetUrl, {});
  }
}
