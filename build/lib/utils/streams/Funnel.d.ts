/// <reference types="node" />
import { Transform } from 'stream';
export declare class Funnel extends Transform {
    private limit;
    private buffer;
    private bufferOffset;
    private lastChunkLength;
    constructor(limit?: number);
    private bufferStillHasData;
    private bufferIsEmpty;
    private pushToReadable;
    private pushBuffer;
    _transform(chunk: Buffer, enc: string, done: (err: Error | null) => void): void;
    _flush(done: () => void): void;
}
