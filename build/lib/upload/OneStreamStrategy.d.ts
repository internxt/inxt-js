/// <reference types="node" />
import { Readable } from 'stream';
import { NegotiateContract, UploadParams, UploadStrategy } from './UploadStrategy';
interface Source {
    size: number;
    stream: Readable;
}
export declare type OneStreamStrategyObject = {
    label: 'OneStreamOnly';
    params: Params;
};
interface Params extends UploadParams {
    source: Source;
}
/**
 * TODO:
 * - Fix progress notification.
 * - Clean shardmeta array whenever is possible.
 * - Tests
 */
export declare class OneStreamStrategy extends UploadStrategy {
    private source;
    private abortables;
    private internalBuffer;
    private shardMetas;
    private aborted;
    private uploadsProgress;
    private progressIntervalId;
    constructor(params: Params);
    getIv(): Buffer;
    getFileEncryptionKey(): Buffer;
    setIv(iv: Buffer): void;
    setFileEncryptionKey(fk: Buffer): void;
    private startProgressInterval;
    private stopProgressInterval;
    upload(negotiateContract: NegotiateContract): Promise<void>;
    private uploadShard;
    private addToAbortables;
    private handleError;
    abort(): void;
    cleanup(): void;
}
export {};
