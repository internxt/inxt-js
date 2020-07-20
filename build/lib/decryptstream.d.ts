/// <reference types="node" />
import { Transform } from 'stream';
export declare class DecryptStream extends Transform {
    private decipher;
    constructor(key: Buffer, iv: Buffer);
    _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void): void;
    _flush(cb: (err: Error | null, data: Buffer) => void): void;
}
export default DecryptStream;
