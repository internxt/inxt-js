/// <reference types="node" />
import { Transform, TransformOptions } from 'stream';
import { ContractNegotiated } from '../contracts';
import { ShardMeta } from '../shardMeta';
declare type ContinueCallback = (err: Error | null) => void;
interface ShardUploadTask {
    meta: ShardMeta;
    contract: ContractNegotiated;
    finished: boolean;
}
export declare class UploadTransform extends Transform {
    private shardUploadTasks;
    private requests;
    private currentShardIndex;
    private currentShardBytes;
    constructor(shardUploadTasks: ShardUploadTask[], totalTasks: number, options?: TransformOptions);
    _transform(chunk: Buffer, enc: string, done: ContinueCallback): void;
    _flush(cb: (err: Error | null) => void): void;
    private pushContent;
    private createRequest;
}
export {};
