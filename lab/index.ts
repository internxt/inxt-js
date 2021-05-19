import { createReadStream, readdirSync, statSync } from 'fs'
import { randomBytes } from 'crypto'
import { resolve } from 'path'
import { getBucketId, getEnvironment } from './setup'
import { DownloadProgressCallback, OnlyErrorCallback, UploadFinishCallback, UploadProgressCallback } from '../src'
import { CreateEntryFromFrameResponse } from '../src/services/request'
import { logger } from '../src/lib/utils/logger'

const env = getEnvironment()
const bucketId = getBucketId()

// const randomFilename = () => randomBytes(25).toString('hex')
// const testFilesDir = './files'

// const files = readdirSync(resolve(__dirname, testFilesDir))

// if (files.length === 0) throw new Error("No test file provided inside ./lab/files folder, please put one and try again")

// const [testFilename] = files

// // we use a random filename to avoid an error because filename is unique in the whole network
// const testFilenameSplitted = testFilename.split(".")
// const extension = testFilenameSplitted[1] ? testFilenameSplitted[1] : ''
// const filename = randomFilename() + (extension ? `.${extension}` : '')

// const [realFilename] = testFilenameSplitted
// const routeToTestFile = `${testFilesDir}/${realFilename}` + (extension ? `.${extension}` : '')
// const rightPathToTestFile = resolve(__dirname, routeToTestFile)

// const { size } = statSync(rightPathToTestFile)

// function up(fileSize: number, progress: UploadProgressCallback, finish: UploadFinishCallback) {
//   const content = createReadStream(rightPathToTestFile)

//   const labUploadParams = { content, name: filename, size: fileSize }

//   env.upload(bucketId, labUploadParams, progress, finish)
// }

async function down(fileId: string, progress: DownloadProgressCallback, finish: OnlyErrorCallback) {
  return new Promise((resolve, reject) => {
    env.download(bucketId, fileId, { progressCallback: progress, finishedCallback: finish })
      .then((outputStream) => {
        outputStream.on('data', () => {});
        outputStream.on('error', reject);
        outputStream.on('end', resolve);
      })
      .catch((err) => {
        reject(err);
      })
  })
} 

// up(size, (progress: number, uploadedBytes: number | null, totalBytes: number | null) => {
//   logger.warn(`progress ${progress}% (${uploadedBytes} from ${totalBytes})`)
// }, async (err: Error | null, res: CreateEntryFromFrameResponse) => {
//   if (err) {
//     logger.error(`error during upload due to ${err.message}`)
//   } else {
//     logger.info('upload finished!')
    
//     await down(res.id, (progress: number, downloadedBytes: number | null, totalBytes: number | null) => {
//       logger.warn(`progress ${progress}% (${downloadedBytes} from ${totalBytes})`)
//     }, (err: Error | null) => {
//       if(err) {
//         logger.error(`there was an error downloading the file due to ${err.message}`)
//       } else {
//         logger.info('download finished!')
//       }
//     }).catch(logger.error)
//   }
// })

down('c7ed55531176bb1f251c71a6', (progress: number, downloadedBytes: number | null, totalBytes: number | null) => {
  logger.warn(`progress ${progress}% (${downloadedBytes} from ${totalBytes})`)
}, (err: Error | null) => {
  if(err) {
    logger.error(`there was an error downloading the file due to ${err.message}`)
  } else {
    logger.info('download finished!')
  }
}).catch(logger.error)
