import DecryptStream from '../src/lib/decryptstream'
import EncryptStream from '../src/lib/encryptStream'
import { createCipheriv, randomBytes, createDecipheriv, createHash } from 'crypto'
import stream from 'stream'
import expect from 'chai'
import assert from 'assert'
import fs from 'fs'
import { Readable } from 'stream'
import crypto from 'crypto'
import { ripemd160, sha256 } from '../src/lib/crypto'
import path from 'path'
import { MerkleTree } from '../src/lib/merkleTree'
// Crypto encryption mock

describe('# Encryption - Decryption logic', () => {
  const algorithm = 'aes-256-ctr'
  const secret = '00000000000000000000000000000000'
  const keyRaw = createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
  const key = Buffer.from(keyRaw, 'utf-8')
  const iv = Buffer.alloc(16) //randomBytes(16)

  const cipher = createCipheriv(algorithm, key, iv);

  const text = 'Joan Mora'

  let encryptedCrypto = cipher.update(text)
  encryptedCrypto = Buffer.concat([encryptedCrypto, cipher.final()])

  const decipher = createDecipheriv(algorithm, key, iv)
  let decryptedCrypto = decipher.update(encryptedCrypto)
  decryptedCrypto = Buffer.concat([decryptedCrypto, decipher.final()])

  it('Check encryption produces same output as encrypting with crypto', () => {
    const encryptedStream = new EncryptStream(key, iv)
    let data: string = ''
    encryptedStream.on('data', (chunk) => data += chunk.toString())
    encryptedStream.on('end', () => assert.strictEqual(data, encryptedCrypto.toString()))
    encryptedStream.write(Buffer.from(text))
    encryptedStream.end()

  })

  it('Check decryption produces the same output as crypto', () => {
    const decryptStream = new DecryptStream(key, iv)
    let data : string = ''
    decryptStream.on('data', (chunk) => data += chunk.toString())
    decryptStream.on('end', () => assert.strictEqual(data, decryptedCrypto.toString()))
    decryptStream.write(encryptedCrypto)
    decryptStream.end()
  })

  it('Check LOCAL-UPLOAD encryption - decryption pipeline', () => {
    const contentStream = new stream.PassThrough()
    let content = ''
    contentStream.on('data', (chunk) => content += chunk.toString())
    contentStream.on('end', () => assert.strictEqual(content, text))

    const readableStreeamInput = new stream.PassThrough()
    readableStreeamInput.end(Buffer.from(text))

    readableStreeamInput
      .pipe(new EncryptStream(key, iv))
      .pipe(new DecryptStream(key, iv))
      .pipe(contentStream)
  })

  it('Check that preleave is generated correctly', () => {

    const fileBuffer = fs.readFileSync('./54.txt')
    const readableStream = Readable.from(fileBuffer.toString())

    new MerkleTree(readableStream).generate()
      .then(console.warn)
      .catch(console.warn)

  })

})