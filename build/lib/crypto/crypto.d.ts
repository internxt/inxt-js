/// <reference types="node" />
import * as crypto from 'crypto';
export declare function sha256(input: Buffer): Buffer;
export declare function sha256HashBuffer(): crypto.Hash;
export declare function sha512(input: Buffer): Buffer;
export declare function sha512HmacBuffer(key: string): crypto.Hmac;
export declare function ripemd160(input: Buffer | string): Buffer;
export declare function GetDeterministicKey(key: string, data: string): Buffer;
export declare function GenerateBucketKey(mnemonic: string, bucketId: string): Promise<string>;
export declare function EncryptFilename(mnemonic: string, bucketId: string, filename: string): Promise<string>;
export declare function DecryptFileName(mnemonic: string, bucketId: string, encryptedName: string): Promise<string | null>;
export declare function EncryptMeta(fileMeta: string, key: Buffer, iv: Buffer): string;
export declare function EncryptMetaBuffer(fileMeta: string, encryptKey: Buffer, iv: Buffer): Buffer;
export declare function Aes256ctrDecrypter(key: Buffer, iv: Buffer): crypto.Decipher;
export declare function Aes256ctrEncrypter(key: Buffer, iv: Buffer): crypto.Cipher;
export declare function Aes256gcmEncrypter(key: Buffer, iv: Buffer): crypto.CipherGCM;
export declare function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer>;
export declare function GenerateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer>;
export declare function GetFileDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer;
