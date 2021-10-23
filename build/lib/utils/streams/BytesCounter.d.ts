/// <reference types="node" />
import { Transform, TransformOptions } from 'stream';
export declare class BytesCounter extends Transform {
    private bytesCount;
    constructor(opts?: TransformOptions);
    get count(): number;
    _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void): void;
    _flush(cb: (err: Error | null) => void): void;
}
