/// <reference types="node" />
import { PassThrough, Readable } from "stream";
import { ConcurrentQueue } from "../concurrentQueue";
import { Abortable } from "../../api/Abortable";
export interface UploadTaskParams {
    shardIndex: number;
    stream: Readable;
    finishCb: () => void;
}
export declare enum Events {
    Error = "uploader-queue-error",
    Progress = "uploader-queue-progress",
    End = "uploader-queue-end"
}
declare type UploadTask = (content: UploadTaskParams) => Promise<any>;
export declare class UploaderQueueV2 extends ConcurrentQueue<UploadTaskParams> implements Abortable {
    private eventEmitter;
    private passthrough;
    private shardIndex;
    private concurrentUploads;
    concurrency: number;
    constructor(parallelUploads: number | undefined, expectedUploads: number | undefined, task: UploadTask);
    getUpstream(): PassThrough;
    handleData(chunk: Buffer): void;
    emit(event: string, ...args: any[]): void;
    getListenerCount(event: string): number;
    getListeners(event: string): Function[];
    on(event: string, listener: (...args: any[]) => void): UploaderQueueV2;
    once(event: string, listener: (...args: any[]) => void): UploaderQueueV2;
    removeAllListeners(): void;
    end(cb?: () => void): void;
    destroy(): void;
    abort(): void;
}
export {};
