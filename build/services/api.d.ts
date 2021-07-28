/// <reference types="node" />
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { EnvironmentConfig } from "..";
import { ExchangeReport } from "../api/reports";
import { Shard } from "../api/shard";
import { INXTRequest } from "../lib";
import { ShardMeta } from "../lib/shardMeta";
export declare enum Methods {
    Get = "GET",
    Post = "POST",
    Put = "PUT"
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
    id: string;
}
export interface FrameStaging {
    id: string;
    user: string;
    shards: [];
    storageSize: number;
    size: number;
    locked: boolean;
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
    id: string;
    index: string;
    frame: string;
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
    hash: string;
    size: number;
    index: number;
    parity: boolean;
    challenges: string[];
    tree: string[];
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
    sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest;
    getShardFromNode(shard: Shard): INXTRequest;
}
declare class InxtApi implements InxtApiI {
    protected config: EnvironmentConfig;
    protected url: string;
    constructor(config: EnvironmentConfig);
    getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest;
    getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest;
    createFrame(params?: AxiosRequestConfig): INXTRequest;
    createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest;
    addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest;
    sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>>;
    sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest;
    getShardFromNode(shard: Shard): INXTRequest;
}
export declare class EmptyBridgeUrlError extends Error {
    constructor();
}
export declare class Bridge extends InxtApi {
    constructor(config: EnvironmentConfig);
    getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest;
    getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest;
    createFrame(params?: AxiosRequestConfig): INXTRequest;
    createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest;
    addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest;
    sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>>;
    sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest;
    getShardFromNode(shard: Shard): INXTRequest;
}
export {};
