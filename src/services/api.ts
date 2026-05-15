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

class EmptyBridgeUrlError extends Error {
  constructor() {
    super('Empty bridge url');
  }
}

export class Bridge {
  protected config: EnvironmentConfig;
  protected url: string;

  constructor(config: EnvironmentConfig) {
    if (!config.bridgeUrl) {
      throw new EmptyBridgeUrlError();
    }

    this.config = config;
    this.url = config.bridgeUrl;
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/tokens`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: { operation, file: fileId } }, false);
  }

  renameFile(bucketId: string, fileId: string, newName: string): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/files/${fileId}`;

    return new INXTRequest(this.config, Methods.Patch, targetUrl, { data: { name: newName } });
  }

  createBucket(bucketName: string) {
    const targetUrl = `${this.url}/buckets`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: { name: bucketName } });
  }

  deleteBucket(bucketId: string) {
    const targetUrl = `${this.url}/buckets/${bucketId}`;

    return new INXTRequest(this.config, Methods.Delete, targetUrl, {});
  }

  getDownloadLinks(bucketId: string, fileIds: string[]) {
    const targetUrl = `${this.url}/buckets/${bucketId}/bulk-files?fileIds=${fileIds.join(',')}`;

    return new INXTRequest(this.config, Methods.Get, targetUrl, {});
  }
}
