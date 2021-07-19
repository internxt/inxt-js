/// <reference types="node" />
import { EventEmitter, Readable } from 'stream';
import * as Winston from 'winston';
import { EnvironmentConfig, UploadProgressCallback } from '..';
import * as api from '../services/request';
import EncryptStream from '../lib/encryptStream';
import { FunnelStream } from "../lib/funnelStream";
import { ShardMeta } from '../lib/shardMeta';
import { ContractNegotiated } from '../lib/contracts';
import { Shard } from "./shard";
export interface FileMeta {
    size: number;
    name: string;
    content: Readable;
}
export declare class FileObjectUpload extends EventEmitter {
    private config;
    private fileMeta;
    private requests;
    private id;
    private aborted;
    shardMetas: ShardMeta[];
    private logger;
    bucketId: string;
    frameId: string;
    index: Buffer;
    encrypted: boolean;
    cipher: EncryptStream;
    funnel: FunnelStream;
    fileEncryptionKey: Buffer;
    constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string, logger: Winston.Logger);
    getSize(): number;
    getId(): string;
    checkIfIsAborted(): void;
    init(): Promise<FileObjectUpload>;
    checkBucketExistence(): Promise<boolean>;
    stage(): Promise<void>;
    SaveFileInNetwork(bucketEntry: api.CreateEntryFromFrameBody): Promise<void | api.CreateEntryFromFrameResponse>;
    negotiateContract(frameId: string, shardMeta: ShardMeta): Promise<void | ContractNegotiated>;
    NodeRejectedShard(encryptedShard: Buffer, shard: Shard): Promise<boolean>;
    GenerateHmac(shardMetas: ShardMeta[]): string;
    encrypt(): EncryptStream;
    private parallelUpload;
    upload(callback: UploadProgressCallback): Promise<ShardMeta[]>;
    uploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number, parity: boolean): Promise<ShardMeta>;
    createBucketEntry(shardMetas: ShardMeta[]): Promise<void>;
    abort(): void;
    isAborted(): boolean;
}
export declare function generateBucketEntry(fileObject: FileObjectUpload, fileMeta: FileMeta, shardMetas: ShardMeta[], rs: boolean): api.CreateEntryFromFrameBody;
