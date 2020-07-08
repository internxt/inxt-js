import { Environment } from '../build/index'

describe('# environment', () => {
  it('should create environment', () => {
    const inxt = new Environment({
      bridgeUrl: 'https://www.test.com',
      bridgeUser: 'test@test.com',
      bridgePass: 'dummy_password',
      encryptionKey: 'crypt'
    })
    inxt.download('a', 'b')
  })
})