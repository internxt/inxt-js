import { Environment } from '../src/index'
import { DecryptStream } from '../src/lib/decryptstream'
import dotenv from 'dotenv'
dotenv.config()

process.on('unhandledRejection', (reason, p) => {
  // console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  console.log('Unhandled Rejection at: Promise')
})

describe('# environment', () => {
  it('should create environment', () => {
    const inxt = new Environment({
      bridgeUrl: 'https://api.internxt.com',
      bridgeUser: process.env.TEST_USER,
      bridgePass: process.env.TEST_PASS,
      encryptionKey: process.env.TEST_KEY
    })


    inxt.resolveFile('e6aa7b3ea8085ee5223c3d08', 'b48c8e3e355f0e82c8180744', './PEPA.jpg', {
      finishedCallback: (err) => {
        console.log('Download finished', err ? err.message : '')
      },
      progressCallback: () => {},
      overwritte: true
    })

   
  })
})