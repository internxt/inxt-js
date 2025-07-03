import * as crypto from 'crypto';
import { mnemonicToSeed } from 'bip39';

import { BUCKET_META_MAGIC, GCM_DIGEST_SIZE, SHA256_DIGEST_SIZE } from './constants';

export function sha256(input: Buffer): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

export function sha256HashBuffer(): crypto.Hash {
  return crypto.createHash('sha256');
}

export function sha512(input: Buffer): Buffer {
  return crypto.createHash('sha512').update(input).digest();
}

export function sha512HmacBuffer(key: Buffer | string): crypto.Hmac {
  return crypto.createHmac('sha512', key);
}

export function sha512HmacBufferFromHex(key: string): crypto.Hmac {
  return crypto.createHmac('sha512', Buffer.from(key, 'hex'));
}

export function ripemd160(input: Buffer | string): Buffer {
  return crypto.createHash('ripemd160').update(input).digest();
}

export function GetDeterministicKey(key: string, data: string): Buffer {
  const sha512input = key + data;

  return crypto.createHash('sha512').update(Buffer.from(sha512input, 'hex')).digest();
}

export async function GenerateBucketKey(mnemonic: string, bucketId: string): Promise<string> {
  const seed = (await mnemonicToSeed(mnemonic)).toString('hex');

  return GetDeterministicKey(seed, bucketId).toString('hex').slice(0, 64);
}

// export async function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer): Promise<Buffer> {
//   const bucketKey = await GenerateBucketKey(mnemonic, bucketId);

//   return GetDeterministicKey(bucketKey.slice(0, 32), index.toString('hex')).slice(0, 32);
// }

export async function EncryptFilename(mnemonic: string, bucketId: string, filename: string): Promise<string> {
  const bucketKey = await GenerateBucketKey(mnemonic, bucketId);

  const GenerateEncryptionKey = () => {
    const hasher = sha512HmacBufferFromHex(bucketKey);
    hasher.update(Buffer.from(BUCKET_META_MAGIC));

    return hasher.digest().slice(0, 32);
  };

  const GenerateEncryptionIv = () => {
    const hasher = sha512HmacBufferFromHex(bucketKey);

    hasher.update(bucketId).update(filename);

    return hasher.digest().slice(0, 32);
  };

  const encryptionKey = GenerateEncryptionKey();
  const encryptionIv = GenerateEncryptionIv();

  return EncryptMeta(filename, encryptionKey, encryptionIv);
}

export async function DecryptFileName(mnemonic: string, bucketId: string, encryptedName: string) {
  const bucketKey = await GenerateBucketKey(mnemonic, bucketId);

  if (!bucketKey) {
    throw Error('Bucket key missing');
  }

  const key = crypto
    .createHmac('sha512', Buffer.from(bucketKey, 'hex'))
    .update(Buffer.from(BUCKET_META_MAGIC))
    .digest('hex');

  return decryptMeta(encryptedName, key);
}

function decryptMeta(bufferBase64: string, decryptKey: string) {
  const data = Buffer.from(bufferBase64, 'base64');

  const digest = data.slice(0, GCM_DIGEST_SIZE);
  const iv = data.slice(GCM_DIGEST_SIZE, GCM_DIGEST_SIZE + SHA256_DIGEST_SIZE);
  const buffer = data.slice(GCM_DIGEST_SIZE + SHA256_DIGEST_SIZE);

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(decryptKey, 'hex').slice(0, 32), iv);
  decipher.setAuthTag(digest);

  try {
    const dec = Buffer.concat([decipher.update(buffer), decipher.final()]);

    return dec.toString('utf8');
  } catch {
    return null;
  }
}

export function EncryptMeta(fileMeta: string, key: Buffer, iv: Buffer): string {
  const cipher: crypto.CipherCCM = Aes256gcmEncrypter(key, iv);
  const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf-8'), cipher.final()]);
  const digest = cipher.getAuthTag();

  return Buffer.concat([digest, iv, cipherTextBuf]).toString('base64');
}

export function EncryptMetaBuffer(fileMeta: string, encryptKey: Buffer, iv: Buffer): Buffer {
  const cipher: crypto.CipherGCM = Aes256gcmEncrypter(encryptKey, iv);
  const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf-8'), cipher.final()]);
  const digest = cipher.getAuthTag();

  return Buffer.concat([digest, iv, cipherTextBuf]);
}

export function Aes256ctrDecrypter(key: Buffer, iv: Buffer): crypto.Decipher {
  return crypto.createDecipheriv('aes-256-ctr', key, iv);
}

export function Aes256ctrEncrypter(key: Buffer, iv: Buffer): crypto.Cipher {
  return crypto.createCipheriv('aes-256-ctr', key, iv);
}

export function Aes256gcmEncrypter(key: Buffer, iv: Buffer): crypto.CipherGCM {
  return crypto.createCipheriv('aes-256-gcm', key, iv);
}

// ENCRYPTION FOR FILE KEY
export async function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> {
  const bucketKey = await GenerateFileBucketKey(mnemonic, bucketId);

  return GetFileDeterministicKey(bucketKey.slice(0, 32), index).slice(0, 32);
}

export async function GenerateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
  const seed = await mnemonicToSeed(mnemonic);

  return GetFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
}

export function GetFileDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer {
  const hash = crypto.createHash('sha512');
  hash.update(key).update(data);

  return hash.digest();
}
