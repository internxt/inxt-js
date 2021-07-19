/// <reference types="node" />
import { PassThrough, Readable } from 'stream';
import { FileObject } from '../../api/FileObject';
import { Shard } from '../../api/shard';
import { ConcurrentQueue } from '../concurrentQueue';
export interface DownloadRequest {
    index: number;
    shard: Shard;
    finishCb?: (result?: any) => void;
}
export declare class DownloadQueue extends ConcurrentQueue<DownloadRequest> {
    private eventEmitter;
    private passthrough;
    private pendingShards;
    private fileObject;
    constructor(parallelDownloads: number | undefined, expectedDownloads: number | undefined, fileObject: FileObject);
    private download;
    getDownstream(): PassThrough;
    start(shards: Shard[]): void;
    handleData(shardContent: Readable, shard: Shard): void;
    private emptyPendingShards;
    cleanup(): void;
    emit(event: string, ...args: any[]): void;
    getListenerCount(event: string): number;
    getListeners(event: string): Function[];
    on(event: string, listener: (...args: any[]) => void): DownloadQueue;
    end(cb?: () => void): void;
}
