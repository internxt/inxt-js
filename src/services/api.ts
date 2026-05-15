import { EnvironmentConfig } from '../api';
import { INXTRequest, Methods } from '../lib';

export interface CreateFileTokenResponse {
  bucket: string;
  encryptionKey: string;
  expires: string;
  id: string;
  mimetype: string;
  operation: 'PUSH' | 'PULL';
  size: number;
  token: string;
}
export type GetDownloadLinksResponse = { fileId: string; link: string; index: string }[];

class InxtApi {
  protected config: EnvironmentConfig;
  protected url: string;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.url = config.bridgeUrl ?? '';
  }
}

class EmptyBridgeUrlError extends Error {
  constructor() {
    super('Empty bridge url');
  }
}

export class Bridge extends InxtApi {
  constructor(config: EnvironmentConfig) {
    if (config.bridgeUrl === '') {
      throw new EmptyBridgeUrlError();
    }
    super(config);
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    const targetUrl = `${this.config.bridgeUrl}/buckets/${bucketId}/tokens`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: { operation, file: fileId } }, false);
  }

  renameFile(bucketId: string, fileId: string, newName: string): INXTRequest {
    const targetUrl = `${this.config.bridgeUrl}/buckets/${bucketId}/files/${fileId}`;

    return new INXTRequest(this.config, Methods.Patch, targetUrl, { data: { name: newName } });
  }

  createBucket(bucketName: string) {
    const targetUrl = `${this.config.bridgeUrl}/buckets`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: { name: bucketName } });
  }

  deleteBucket(bucketId: string) {
    const targetUrl = `${this.config.bridgeUrl}/buckets/${bucketId}`;

    return new INXTRequest(this.config, Methods.Delete, targetUrl, {});
  }

  getDownloadLinks(bucketId: string, fileIds: string[]) {
    const targetUrl = `${this.config.bridgeUrl}/buckets/${bucketId}/bulk-files?fileIds=${fileIds.join(',')}`;

    return new INXTRequest(this.config, Methods.Get, targetUrl, {});
  }
}
