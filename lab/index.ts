import { createReadStream, readdirSync, statSync } from 'fs'
import { randomBytes } from 'crypto'
import { resolve } from 'path'
import { getBucketId, getEnvironment } from './setup'

const env = getEnvironment()
const bucketId = getBucketId()

const randomFilename = () => randomBytes(25).toString('hex')
const testFilesDir = './files'

const files = readdirSync(resolve(__dirname, testFilesDir))

if (files.length === 0) throw new Error("No test file provided inside ./lab/files folder, please put one and try again")

const [testFilename] = files

// we use a random filename to avoid an error because filename is unique in the whole network
const testFilenameSplitted = testFilename.split(".")
const extension = testFilenameSplitted[1] ? testFilenameSplitted[1] : ''
const filename = randomFilename() + (extension ? `.${extension}` : '')

const [realFilename] = testFilenameSplitted
const routeToTestFile = `${testFilesDir}/${realFilename}` + (extension ? `.${extension}` : '')
const rightPathToTestFile = resolve(__dirname, routeToTestFile)

const { size } = statSync(rightPathToTestFile)

async function up (fileSize: number) {    
    // const encryptedFilename = await EncryptFilename(mnemonic, bucketId, filename)
    const content = createReadStream(rightPathToTestFile)

    const labUploadParams = { content, name: filename, size: fileSize }

    return await env.labUpload(bucketId, labUploadParams)
}

async function down (fileId: string) {
    const file = await env.labDownload(bucketId, fileId)
    file.on('data', (chunk: Buffer) => {
        console.log(chunk.toString('utf-8'))
    })
} 

up(size).then((res) => {
    console.log('uploaded', res)

    down(res.id)
        .then(console.log)
        .catch(console.log)

}).catch(console.log)
