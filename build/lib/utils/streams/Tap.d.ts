/// <reference types="node" />
import { Transform, TransformOptions } from "stream";
export declare enum TapEvents {
    Opened = "tap-opened",
    Closed = "tap-closed"
}
declare type ContinueCallback = (err: Error | null) => void;
export declare class Tap extends Transform {
    private diameterSize;
    private bytesRead;
    private temporalBuffer;
    private pausedInterval;
    private shouldContinue;
    constructor(diameterSize: number, options?: TransformOptions);
    _transform(chunk: Buffer, enc: string, done: ContinueCallback): void;
    pump(b: Buffer): void;
    open(): void;
    close(cb: ContinueCallback): void;
    _flush(done: () => void): void;
}
export {};
