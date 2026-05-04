import * as crypto from 'crypto';
import { mnemonicToSeed } from 'bip39';

export function sha256(input: Buffer): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

// ENCRYPTION FOR FILE KEY
export async function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> {
  const bucketKey = await GenerateFileBucketKey(mnemonic, bucketId);

  return GetFileDeterministicKey(bucketKey.slice(0, 32), index).slice(0, 32);
}

async function GenerateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
  const seed = await mnemonicToSeed(mnemonic);

  return GetFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
}

function GetFileDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer {
  const hash = crypto.createHash('sha512');
  hash.update(key).update(data);

  return hash.digest();
}
