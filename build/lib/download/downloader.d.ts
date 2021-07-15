/// <reference types="node" />
import { Readable } from 'stream';
interface PendingDownload {
    index: number;
    content: Readable;
}
export declare class QueueStream {
    private pendingDownloads;
    private downloadsNumber;
    private streamsQueue;
    private internalStream;
    constructor(downloadsNumber: number, concurrency?: number);
    attach(download: PendingDownload | PendingDownload[]): void;
    getContent(): Readable;
    end(): void;
}
export {};
