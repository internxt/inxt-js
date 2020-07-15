import { Environment } from '../src/index'
import { DecryptStream } from '../src/lib/decryptstream'

process.on('unhandledRejection', (reason, p) => {
  // console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  console.log('Unhandled Rejection at: Promise');
});

describe('# environment', () => {
  it('should create environment', () => {
    const inxt = new Environment({
      bridgeUrl: 'https://api.internxt.com',
      bridgeUser: process.env.TEST_USER,
      bridgePass: process.env.TEST_PASS,
      encryptionKey: process.env.TEST_KEY
    })
    const x = new DecryptStream(Buffer.from('aabdfb3018eb9e93bd9a31936aad979bed83abcc60fd79c15c15f44321024f46').slice(0, 32), Buffer.from('aabdfb3018eb9e93bd9a31936aad979bed83abcc60fd79c15c15f44321024f46').slice(0, 16))


    inxt.resolveFile('e6aa7b3ea8085ee5223c3d08', 'a0b7bcc5521da01448e9941e', 'filePath', {
      finishedCallback: () => {

      },
      progressCallback: () => {

      },
      overwritte: true
    }).then(r => {
      console.log(r)
    })


  })
})