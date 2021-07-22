import { AxiosRequestConfig, AxiosResponse } from "axios";
import { EnvironmentConfig } from "..";
import { ExchangeReport } from "../api/reports";
import { Shard } from "../api/shard";
import { ContractNegotiated } from "../lib/contracts";
import { ShardMeta } from "../lib/shardMeta";
import { INXTRequest, request } from "./request";

export enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT'
}

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
    type: string,
    value: string
  };
  erasure?: {
    type: string
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
    value: string,
    type: string
  };
  erasure: {
    type: string
  };
  size: number;
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

export interface InxtApiI {
  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest;
  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest;
  createFrame(params?: AxiosRequestConfig): INXTRequest;
  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest;
  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest;
  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>>;
  sendShardToNode(shard: Shard): INXTRequest;
}

function emptyINXTRequest(config: EnvironmentConfig): INXTRequest {
  return new INXTRequest(config, Methods.Get, '', false);
}

class InxtApi implements InxtApiI {
  protected config: EnvironmentConfig;
  protected url: string;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.url = config.bridgeUrl ?? '';
  }

  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  createFrame(params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>> {
    return exchangeReport.sendReport();
  }

  sendShardToNode(shard: Shard): INXTRequest {
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
      }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Get, targetUrl, false);
  }

  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/file-ids/${fileId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Get, targetUrl, false);
  }

  createFrame(params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/frames`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Post, targetUrl, false);
  }

  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/files`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      data: body
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Post, targetUrl, false);
  }

  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/frames/${frameId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      data: { ...body, challenges: body.challenges_as_str }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Put, targetUrl, false);
  }

  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>> {
    return exchangeReport.sendReport();
  }

  sendShardToNode(shard: Shard): INXTRequest {
    const targetUrl = `http://${shard.farmer.address}:${shard.farmer.port}/shards/${shard.hash}?token=${shard.token}`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, true);
  }
}
