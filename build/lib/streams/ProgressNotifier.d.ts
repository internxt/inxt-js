/// <reference types="node" />
import { Transform, TransformOptions } from 'stream';
export declare enum Events {
    Progress = "progress"
}
export declare class ProgressNotifier extends Transform {
    private readBytes;
    private progressInterval;
    constructor(totalBytes: number, opts?: TransformOptions);
    _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void): void;
    _flush(cb: (err: Error | null) => void): void;
}
