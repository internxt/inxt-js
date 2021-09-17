/// <reference types="node" />
import { UploadStrategy } from './UploadStrategy';
export declare class EmptyStrategy extends UploadStrategy {
    constructor();
    getIv(): Buffer;
    getFileEncryptionKey(): Buffer;
    setIv(iv: Buffer): void;
    setFileEncryptionKey(fk: Buffer): void;
    upload(): Promise<void>;
    abort(): void;
}
