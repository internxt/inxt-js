import { GenerateBucketKey, GenerateFileKey } from '../src/lib/crypto'
import { expect } from 'chai'
import { INDEX, MNEMONIC, BUCKET_ID, BUCKET_KEY, FILE_KEY } from './mocks/encryptionCredentials'


const bucket_key = BUCKET_KEY
const file_key = Buffer.from(FILE_KEY, 'hex')


describe('# Generate Bucket Key', () => {
  it('Check generated BucketKey', async () => {
    const bucketKeyHypothesis = await GenerateBucketKey(MNEMONIC, BUCKET_ID)
    expect(bucketKeyHypothesis.slice(0, 32).toString("hex")).to.equal(bucket_key)
  })
})

describe('# Generate FileKey', () => {
  it('Check FileKey generator', async () => {
    const fileKeyHypothesis = await GenerateFileKey(MNEMONIC, BUCKET_ID, INDEX)
    expect(fileKeyHypothesis.toString("hex")).to.equal(file_key.toString("hex"))
  })
})