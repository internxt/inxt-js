import crypto from 'crypto'
import { mnemonicToSeed } from 'bip39'

export function sha256(input: Buffer): Buffer {
  return crypto.createHash('sha256').update(input).digest()
}

export function sha256HashBuffer(): crypto.Hash {
  return crypto.createHash('sha256')
}

export function sha512(input: Buffer): Buffer {
  return crypto.createHash('sha512').update(input).digest()
}

export function sha512HmacBuffer(key: Buffer | string): crypto.Hmac {
  return crypto.createHmac('sha512', key)
}

export function ripemd160(input: Buffer | string): Buffer {
  return crypto.createHash('ripemd160').update(input).digest()
}

export function GetDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer {
  const hash = crypto.createHash('sha512')
  hash.update(key).update(data)
  return hash.digest()
}

export async function GenerateBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
  const seed = await mnemonicToSeed(mnemonic)
  return GetDeterministicKey(seed, Buffer.from(bucketId, 'hex'))
}

export async function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> {
  const bucketKey = await GenerateBucketKey(mnemonic, bucketId)
  return GetDeterministicKey(bucketKey.slice(0, 32), index).slice(0, 32)
}

export function Aes256ctrDecrypter(key: Buffer, iv: Buffer): crypto.Decipher {
  return crypto.createDecipheriv('aes-256-ctr', key, iv)
}