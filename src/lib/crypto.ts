import * as crypto from 'crypto'
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

export const BUCKET_META_MAGIC = [66,150,71,16,50,114,88,160,163,35,154,65,162,213,226,215,70,138,57,61,52,19,210,170,38,164,162,200,86,201,2,81]
export const BUCKET_NAME_MAGIC = "398734aab3c4c30c9f22590e83a95f7e43556a45fc2b3060e0c39fde31f50272"
export const AES_BLOCK_SIZE = 16

export async function EncryptFilename(mnemonic: string, bucketId: string, filename: string) : Promise<string> {
  const bucketKey = await GenerateBucketKey(mnemonic, bucketId)

  const GenerateEncryptionKey = () => {
    const hasher = sha512HmacBuffer(bucketKey)
    hasher.update(Buffer.from(BUCKET_META_MAGIC))

    return hasher.digest().slice(0, 32)
  }

  const GenerateEncryptionIv = () => {
    const hasher = sha512HmacBuffer(bucketKey)
    
    if(bucketId === BUCKET_NAME_MAGIC) {
      hasher.update(bucketId)
    }

    hasher.update(filename)
    return hasher.digest().slice(0, 32)
  }

  const encryptionKey = GenerateEncryptionKey()
  const encryptionIv  = GenerateEncryptionIv()

  return EncryptMeta(filename, encryptionKey, encryptionIv)
}

export function EncryptMeta (fileMeta: string, key: Buffer, iv: Buffer) : string {
  const cipher = Aes256gcmEncrypter(key, iv)
  const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf-8'), cipher.final()])
  return Buffer.concat([cipherTextBuf, iv]).toString('base64')
}

export function EncryptMetaBuffer (fileMeta: string, encryptKey: Buffer, iv: Buffer) : Buffer {
  const cipher = Aes256gcmEncrypter(encryptKey, iv)
  const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf-8'), cipher.final()])
  return Buffer.concat([cipherTextBuf, iv])
}

export function Aes256ctrDecrypter(key: Buffer, iv: Buffer): crypto.Decipher {
  return crypto.createDecipheriv('aes-256-ctr', key, iv)
}

export function Aes256ctrEncrypter(key: Buffer, iv: Buffer): crypto.Cipher {
  return crypto.createCipheriv('aes-256-ctr', key, iv)
}

export function Aes256gcmEncrypter(key: Buffer, iv: Buffer): crypto.Cipher {
  return crypto.createCipheriv('aes-256-gcm', key, iv)
}