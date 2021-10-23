/// <reference types="node" />
import { URL } from 'url';
import EventEmitter from 'events';
declare type FinishCallback = (res: Buffer | null, err?: Error) => void;
export declare class ChunkedRequest extends EventEmitter {
    private options;
    private stream;
    private passthrough;
    private response;
    constructor(url: URL);
    write(b: Buffer, end: boolean | undefined, finishCb: FinishCallback): void;
    end(b: Buffer, cb: FinishCallback): void;
    destroy(): void;
}
export {};
