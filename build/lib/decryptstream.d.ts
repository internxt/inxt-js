/// <reference types="node" />
import { Transform } from 'stream';
/**
 * Creates a new stream to decrypt one file
 */
export declare class DecryptStream extends Transform {
    private decipher;
    private totalBytesDecrypted;
    constructor(key: Buffer, iv: Buffer);
    _transform: (chunk: Buffer, enc: any, callback: any) => void;
    _flush: (callback: any) => void;
}
export default DecryptStream;
