/// <reference types="node" />
import { Hash } from 'crypto';
import { Transform, TransformCallback, TransformOptions } from 'stream';
export declare class HashStream extends Transform {
    hasher: Hash;
    finalHash: Buffer;
    constructor(opts?: TransformOptions);
    _transform(chunk: Buffer, enc: BufferEncoding, cb: TransformCallback): void;
    _flush(cb: (err: Error | null) => void): void;
    readHash(): Buffer;
    getHash(): Buffer;
}
