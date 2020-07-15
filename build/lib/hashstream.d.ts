/// <reference types="node" />
import stream from 'stream';
export declare class HashStream extends stream.Transform {
    private hasher;
    private length;
    private flushed;
    private finalHash;
    private expectedSize;
    constructor(expectedSize?: number);
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: any): void;
    _flush(): void;
    read(): Buffer;
}
