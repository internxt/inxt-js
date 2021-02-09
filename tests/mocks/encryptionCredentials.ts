import dotenv from 'dotenv'
dotenv.config()

const EncryptionCredentials = {
  INDEX: Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', "hex"),
  MNEMONIC: process.env.TEST_KEY,
  BUCKET_ID: process.env.TEST_BUCKET_ID,
  BUCKET_KEY: process.env.TEST_BUCKET_KEY,
  FILE_KEY: process.env.TEST_FILE_KEY
}

module.exports = EncryptionCredentials