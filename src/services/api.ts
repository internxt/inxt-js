import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig, ExchangeReport, Shard } from '../api';
import { INXTRequest, Methods } from '../lib';
import { ShardMeta } from '../lib/models';

export interface GetBucketByIdResponse {
  user: string;
  encryptionKey: string;
  publicPermissions: string[];
  created: string;
  name: string;
  pubkeys: string[];
  status: 'Active' | 'Inactive';
  transfer: number;
  storage: number;
  id: string;
}

export interface GetFileByIdResponse {
  /* file-id */
  id: string;
}

export interface FrameStaging {
  /* frame id */
  id: string;
  /* user email */
  user: string;
  shards: [];
  storageSize: number;
  /* frame size */
  size: number;
  locked: boolean;
  /* created timestamp stringified */
  created: string;
}

export interface CreateEntryFromFrameBody {
  frame: string;
  filename: string;
  index: string;
  hmac: {
    type: string;
    value: string;
  };
  erasure?: {
    type: string;
  };
}

export interface CreateEntryFromFrameResponse {
  /* bucket entry id */
  id: string;
  index: string;
  /* frame id */
  frame: string;
  /* bucket id */
  bucket: string;
  mimetype: string;
  name: string;
  renewal: string;
  created: string;
  hmac: {
    value: string;
    type: string;
  };
  erasure: {
    type: string;
  };
  size: number;
}

export interface SendShardToNodeResponse {
  result: string;
}

export interface AddShardToFrameBody {
  /* shard hash */
  hash: string;
  /* shard size */
  size: number;
  /* shard index */
  index: number;
  /* if exists a shard parity for this shard */
  parity: boolean;
  /* shard challenges */
  challenges: string[];
  tree: string[];
  /* nodes excluded from being the shard's node */
  exclude: string[];
}

export interface SendShardToNodeResponse {
  result: string;
}

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

export interface InxtApiI {
  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest;
  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest;
  createFrame(params?: AxiosRequestConfig): INXTRequest;
  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest;
  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest;
  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>>;
  sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest;
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest;
  renameFile(bucketId: string, fileId: string, newName: string): INXTRequest;
  createBucket(bucketName: string): INXTRequest;
}

function emptyINXTRequest(config: EnvironmentConfig): INXTRequest {
  return new INXTRequest(config, Methods.Get, '', {}, false);
}

class InxtApi implements InxtApiI {
  protected config: EnvironmentConfig;
  protected url: string;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.url = config.bridgeUrl ?? '';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createFrame(params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>> {
    return exchangeReport.sendReport();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  renameFile(bucketId: string, fileId: string, newName: string): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createBucket(bucketName: string): INXTRequest {
    return emptyINXTRequest(this.config);
  }
}

// tslint:disable-next-line: max-classes-per-file
export class EmptyBridgeUrlError extends Error {
  constructor() {
    super('Empty bridge url');
  }
}

// tslint:disable-next-line: max-classes-per-file
export class Bridge extends InxtApi {
  constructor(config: EnvironmentConfig) {
    if (config.bridgeUrl === '') {
      throw new EmptyBridgeUrlError();
    }
    super(config);
  }

  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Get, targetUrl, finalParams, false);
  }

  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/file-ids/${fileId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Get, targetUrl, finalParams, false);
  }

  createFrame(params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/frames`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Post, targetUrl, finalParams, false);
  }

  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/files`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Post, targetUrl, finalParams, false);
  }

  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/frames/${frameId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
      data: { ...body, challenges: body.challenges_as_str },
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Put, targetUrl, finalParams, false);
  }

  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>> {
    return exchangeReport.sendReport();
  }

  sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest {
    const targetUrl = `http://${shard.farmer.address}:${shard.farmer.port}/shards/${shard.hash}?token=${shard.token}`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: shardContent }, true);
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
