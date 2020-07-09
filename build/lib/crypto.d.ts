/// <reference types="node" />
import crypto from 'crypto';
export declare function sha256(input: Buffer): Buffer;
export declare function sha256HashBuffer(): crypto.Hash;
export declare function sha512(input: Buffer): Buffer;
export declare function sha512HmacBuffer(key: Buffer | string): crypto.Hmac;
export declare function ripemd160(input: Buffer | string): Buffer;
export declare function GetDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer;
export declare function GenerateBucketKey(mnemonic: string, bucketId: string): Promise<Buffer>;
export declare function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer>;
export declare function Aes256ctrDecrypter(key: Buffer, iv: Buffer): crypto.Decipher;
