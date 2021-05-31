/// <reference types="node" />
import { Transform } from 'stream';
export default class CutterStream extends Transform {
    private until;
    constructor(until: number);
    transform(chunk: Buffer, enc: string, cb: (err: Error | null, chunk: Buffer) => void): void;
}
