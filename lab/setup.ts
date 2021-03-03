import { Environment, EnvironmentConfig } from '../src'

import * as dotenv from 'dotenv'
dotenv.config({ path: '/home/inxt/inxt-js/.env' })

const bridgeUser = process.env.TEST_USER
const bridgePass = process.env.TEST_PASS
const bridgeUrl  = process.env.INXT_API_URL
const mnemonic   = process.env.TEST_KEY
const bucketId   = process.env.TEST_BUCKET_ID

if (!mnemonic)   throw new Error('Empty mnemonic, check your env vars')
if (!bucketId)   throw new Error('Empty bucketId, check your env vars')
if (!bridgeUrl)  throw new Error('Empty bridgeUrl, check your env vars')
if (!bridgePass) throw new Error('Empty bridgePass, check your env vars')
if (!bridgeUser) throw new Error('Empty bridgeUser, check your env vars')

export const getBucketId = () : string => {
    return bucketId
}

export const getConfig = () : EnvironmentConfig => {
    return { bridgeUser, bridgePass, bridgeUrl, encryptionKey: mnemonic }
}

export const getEnvironment = () : Environment => {
    return new Environment(getConfig())
}
