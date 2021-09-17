/// <reference types="node" />
import { Readable } from 'stream';
import { NegotiateContract, UploadParams, UploadStrategy } from './UploadStrategy';
interface Source {
    size: number;
    hash: string;
    stream: Readable;
}
export interface Params extends UploadParams {
    source: Source;
}
export declare class OneStreamStrategy extends UploadStrategy {
    private source;
    private abortables;
    constructor(params: Params);
    getIv(): Buffer;
    getFileEncryptionKey(): Buffer;
    setIv(iv: Buffer): void;
    setFileEncryptionKey(fk: Buffer): void;
    upload(negotiateContract: NegotiateContract): Promise<void>;
    private addToAbortables;
    abort(): void;
}
export {};
