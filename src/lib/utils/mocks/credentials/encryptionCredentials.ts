import dotenv from 'dotenv'
dotenv.config()

const EncryptionCredentials = {
  INDEX: Buffer.from(process.env.TEST_INDEX ? process.env.TEST_INDEX : "", "hex"),
  MNEMONIC: process.env.TEST_KEY ? process.env.TEST_KEY : "",
  BUCKET_ID: process.env.TEST_BUCKET_ID ? process.env.TEST_BUCKET_ID : "",
  BUCKET_KEY: process.env.TEST_BUCKET_KEY ? process.env.TEST_BUCKET_KEY : "",
  FILE_KEY: process.env.TEST_FILE_KEY ? process.env.TEST_FILE_KEY : "",
  IV: Buffer.from(process.env.TEST_IV ? process.env.TEST_IV : "", 'hex')
}

module.exports = EncryptionCredentials