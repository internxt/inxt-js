/// <reference types="node" />
import { Transform } from 'stream';
interface RawShard {
    size: number;
    index: number;
}
export declare class EncryptStream extends Transform {
    private cipher;
    encrypted_bytes: number;
    shards: RawShard[];
    private indexCounter;
    constructor(key: Buffer, iv: Buffer);
    _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void): void;
    _flush(cb: (err: Error | null, data: Buffer) => void): void;
}
export default EncryptStream;
