/// <reference types="node" />
import { EnvironmentConfig } from "..";
import { Readable } from 'stream';
import * as api from '../services/request';
import EncryptStream from "../lib/encryptStream";
import { FunnelStream } from "../lib/funnelStream";
import { ShardMeta } from '../lib/shardMeta';
import { ContractNegotiated } from '../lib/contracts';
import { Shard } from "./shard";
export interface FileMeta {
    size: number;
    name: string;
    content: Readable;
}
export declare class FileObjectUpload {
    private config;
    private fileMeta;
    bucketId: string;
    frameId: string;
    index: Buffer;
    cipher: EncryptStream;
    funnel: FunnelStream;
    fileEncryptionKey: Buffer;
    constructor(config: EnvironmentConfig, fileMeta: FileMeta, bucketId: string);
    init(): Promise<void>;
    CheckBucketExistance(): Promise<boolean>;
    StageFile(): Promise<api.FrameStaging | void>;
    SaveFileInNetwork(bucketEntry: api.CreateEntryFromFrameBody): Promise<void | api.CreateEntryFromFrameResponse>;
    NegotiateContract(frameId: string, shardMeta: ShardMeta): Promise<void | ContractNegotiated>;
    NodeRejectedShard(encryptedShard: Buffer, shard: Shard): Promise<boolean>;
    GenerateHmac(shardMetas: ShardMeta[]): string;
    StartUploadFile(): Promise<EncryptStream>;
    UploadShard(encryptedShard: Buffer, shardSize: number, frameId: string, index: number, attemps: number): Promise<ShardMeta>;
}
