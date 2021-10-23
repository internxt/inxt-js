/// <reference types="node" />
import { Readable } from 'stream';
import { NegotiateContract, UploadParams, UploadStrategy } from './strategy';
import { ActionState } from '../../../api';
import { UploadStrategyLabel, UploadStrategyObject } from './strategy';
import { UploadOptions } from './';
interface Source {
    size: number;
    stream: Readable;
}
interface Params extends UploadParams {
    source: Source;
}
export declare type UploadOneStreamStrategyLabel = UploadStrategyLabel & 'OneStreamOnly';
export declare type UploadOneStreamStrategyObject = UploadStrategyObject & {
    label: UploadOneStreamStrategyLabel;
    params: Params;
};
export declare type UploadOneStreamStrategyFunction = (bucketId: string, fileId: string, opts: UploadOptions, strategyObj: UploadOneStreamStrategyObject) => ActionState;
/**
 * TODO:
 * - Fix progress notification.
 * - Clean shardmeta array whenever is possible.
 * - Tests
 */
export declare class UploadOneStreamStrategy extends UploadStrategy {
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
