/// <reference types="node" />
import * as https from 'https';
import { Readable, Writable } from 'stream';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
import { ExchangeReport } from '../api/reports';
import { ShardMeta } from '../lib/shardMeta';
import { ContractNegotiated } from '../lib/contracts';
import { Shard } from '../api/shard';
declare enum Methods {
    Get = "GET",
    Post = "POST"
}
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean): Promise<AxiosResponse<JSON>>;
export declare class INXTRequest {
    private req;
    private cancel;
    private method;
    private config;
    targetUrl: string;
    private useProxy;
    private streaming;
    constructor(config: EnvironmentConfig, method: Methods, targetUrl: string, useProxy?: boolean);
    start<K>(params?: AxiosRequestConfig): Promise<K>;
    stream<K>(content: Readable | Writable, options?: https.RequestOptions): Promise<K>;
    abort(): void;
    isCancelled(err: Error): boolean;
}
export declare function streamRequest(targetUrl: string, nodeID: string, useProxy?: boolean, timeoutSeconds?: number): Promise<Readable>;
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
/**
 * Checks if a bucket exists given its id
 * @param config App config
 * @param bucketId
 * @param token
 * @param jwt JSON Web Token
 * @param params
 */
export declare function getBucketById(config: EnvironmentConfig, bucketId: string, params?: AxiosRequestConfig): INXTRequest;
interface GetFileByIdResponse {
    id: string;
}
/**
 * Checks if a file exists given its id and a bucketId
 * @param config App config
 * @param bucketId
 * @param fileId
 * @param jwt JSON Web Token
 * @param params
 */
export declare function getFileById(config: EnvironmentConfig, bucketId: string, fileId: string, params?: AxiosRequestConfig): Promise<GetFileByIdResponse | void>;
export interface FrameStaging {
    id: string;
    user: string;
    shards: [];
    storageSize: number;
    size: number;
    locked: boolean;
    created: string;
}
/**
 * Creates a file staging frame
 * @param config App config
 * @param params
 */
export declare function createFrame(config: EnvironmentConfig, params?: AxiosRequestConfig): INXTRequest;
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
/**
 * Creates a bucket entry from the given frame object
 * @param {EnvironmentConfig} config App config
 * @param {string} bucketId
 * @param {CreateEntryFromFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
export declare function createEntryFromFrame(config: EnvironmentConfig, bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): Promise<CreateEntryFromFrameResponse | void>;
/**
 * Negotiates a storage contract and adds the shard to the frame
 * @param {EnvironmentConfig} config App config
 * @param {string} frameId
 * @param {AddShardToFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
export declare function addShardToFrame(config: EnvironmentConfig, frameId: string, body: ShardMeta, params?: AxiosRequestConfig): Promise<ContractNegotiated | void>;
/**
 * Sends an upload exchange report
 * @param config App config
 * @param body
 */
export declare function sendUploadExchangeReport(config: EnvironmentConfig, exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>>;
export interface SendShardToNodeResponse {
    result: string;
}
/**
 * Stores a shard in a node
 * @param config App config
 * @param shard Interface that has the contact info
 * @param content Buffer with shard content
 */
export declare function sendShardToNode(config: EnvironmentConfig, shard: Shard): INXTRequest;
export {};
