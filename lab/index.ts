import { createReadStream, createWriteStream, readdirSync, statSync } from 'fs'
import { randomBytes } from 'crypto'
import { resolve } from 'path'
import { getBucketId, getEnvironment } from './setup'
import { DownloadFinishedCallback, DownloadProgressCallback, OnlyErrorCallback, UploadFinishCallback, UploadProgressCallback } from '../src'
import { CreateEntryFromFrameResponse } from '../src/services/request'
import { logger } from '../src/lib/utils/logger'
import { Readable } from 'stream'

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

  env.upload(bucketId, labUploadParams, progress, finish)
}

function down(fileId: string, progress: DownloadProgressCallback, finish: DownloadFinishedCallback) {
  const state = env.download(bucketId, fileId, { progressCallback: progress, finishedCallback: finish })

  setTimeout(() => state.stop(), 30000); 
} 

// new Promise((resolve, reject) => {
//   up(size, (progress: number, uploadedBytes: number | null, totalBytes: number | null) => {
//     logger.warn(`progress ${progress}% (${uploadedBytes} from ${totalBytes})`)
//   }, (err: Error | null, res: CreateEntryFromFrameResponse | null) => {
//     if (err) {
//       logger.error(`error during upload due to ${err.message}`)
//       reject(err);
//     } else {
//       logger.info('Upload finished.');
//       resolve(null);
//     }
//   })
// }).then(() => {
//   process.exit(0);
// }).catch((err) => {
//   logger.error(err);
//   process.exit(-1); 
// })


down('', (progress: number, downloadedBytes: number | null, totalBytes: number | null) => {
  logger.warn(`progress ${progress}% (${downloadedBytes} from ${totalBytes})`)
}, (err: Error | null, fileStream: Readable) => {
  if(err) {
    logger.error('There was an error downloading the file due to %s', err.message);

    process.exit(-1);
  } 

  if (!fileStream) {
    logger.info('File stream is null');

    process.exit(-1);
  }

  logger.info('Download finished');

  fileStream.pipe(createWriteStream('prueba.zip'))
    .on('error', (writingErr) => {
      logger.error('There was an error creating file in fs', writingErr.message);
      console.error(writingErr);

      process.exit(-1);
    })
    .on('end', () => {
      process.exit(0);
    });
});