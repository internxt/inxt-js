import crypto from 'crypto'

export function sha256(input: Buffer): Buffer {
  return crypto.createHash('sha256').update(input).digest()
}

export function sha512(input: Buffer): Buffer {
  return crypto.createHash('sha512').update(input).digest()
}

export function ripemd160(input: Buffer): Buffer {
  return crypto.createHash('ripemd160').update(input).digest()
}