/// <reference types="node" />
import { Readable } from 'stream';
import { ShardMeta } from '../shardMeta';
import { NegotiateContract, UploadParams, UploadStrategy } from './UploadStrategy';
import { ContractNegotiated } from '../contracts';
export declare type MultipleStreamsStrategyObject = {
    label: 'MultipleStreams';
    params: Params;
};
interface Params extends UploadParams {
    filepath: string;
}
interface LocalShard {
    size: number;
    index: number;
    filepath: string;
}
export interface ContentAccessor {
    getStream(): Readable;
}
declare type LoggerFunction = (message: string, ...meta: any[]) => void;
interface Logger {
    debug: LoggerFunction;
    info: LoggerFunction;
    error: LoggerFunction;
}
export declare class StreamFileSystemStrategy extends UploadStrategy {
    private filepath;
    private abortables;
    private logger;
    constructor(params: Params, logger: Logger);
    getIv(): Buffer;
    getFileEncryptionKey(): Buffer;
    setIv(iv: Buffer): void;
    setFileEncryptionKey(fk: Buffer): void;
    private generateShardAccessors;
    negotiateContracts(shardMetas: ShardMeta[], negotiateContract: NegotiateContract): Promise<(ContractNegotiated & {
        shardIndex: number;
    })[]>;
    generateShardMetas(shards: (LocalShard & ContentAccessor)[]): Promise<ShardMeta[]>;
    upload(negotiateContract: NegotiateContract): Promise<void>;
    abort(): void;
}
export {};
