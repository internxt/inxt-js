/// <reference types="node" />
import { Transform } from 'stream';
export declare class TestStream extends Transform {
    totalBytes: number;
    totalSize: number;
    offset: number;
    endPosition: number;
    startPosition: number;
    constructor(totalSize: number);
    _pushChunk(chunk: Buffer, cb: any): void;
    _transform(chunk: Buffer, enc: any, cb: any): void;
    takeSliceOf(chunk: Buffer, sliceSize: number): Buffer;
    _flush(cb: any): void;
}
export default TestStream;
