/// <reference types="node" />
import { PassThrough } from "stream";
import { FileObjectUpload } from "../../api/FileObjectUpload";
import { ConcurrentQueue } from "../concurrentQueue";
export interface UploadRequest {
    content: Buffer;
    index: number;
    finishCb?: (result?: any) => void;
}
export declare class UploaderQueue extends ConcurrentQueue<UploadRequest> {
    private eventEmitter;
    private passthrough;
    private shardIndex;
    private concurrentUploads;
    concurrency: number;
    constructor(parallelUploads: number | undefined, expectedUploads: number | undefined, fileObject: FileObjectUpload);
    private static upload;
    getUpstream(): PassThrough;
    handleData(chunk: Buffer): void;
    emit(event: string, ...args: any[]): void;
    getListenerCount(event: string): number;
    getListeners(event: string): Function[];
    on(event: string, listener: (...args: any[]) => void): UploaderQueue;
    once(event: string, listener: (...args: any[]) => void): UploaderQueue;
    end(cb?: () => void): void;
}
