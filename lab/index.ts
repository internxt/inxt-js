import { createReadStream, readdirSync, statSync } from 'fs'
import { randomBytes } from 'crypto'
import { resolve } from 'path'
import { getBucketId, getEnvironment } from './setup'
import { UploadFinishCallback, UploadProgressCallback } from '../src'
import { CreateEntryFromFrameResponse } from '../src/services/request'

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

function up(fileSize: number, progress: UploadProgressCallback, finish: UploadFinishCallback) {
    const content = createReadStream(rightPathToTestFile)

    const labUploadParams = { content, name: filename, size: fileSize }

    env.labUpload(bucketId, labUploadParams, progress, finish)
}

async function down (fileId: string) {
    const file = await env.labDownload(bucketId, fileId)
    file.on('data', (chunk: Buffer) => {
        console.log('downloaded chunk', chunk.toString('hex').slice(0, 32))
    })
} 

up(size, (progress: number, uploadedBytes: number | null, totalBytes: number | null) => {
    console.log(`progress ${progress}%`)
    console.log(`uploaded ${uploadedBytes} from ${totalBytes}`)
}, async (err: Error | null, res: CreateEntryFromFrameResponse) => {
    if (err) {
      console.error(`Error during upload due to ${err.message}`)
    } else {
      console.log('finished upload correctly!')
      await down(res.id)
        .then(console.log)
        .catch(console.log)
    }
})
