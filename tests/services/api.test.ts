import { Bridge } from '../../src/services/api';

describe('services/api.ts', () => {
  describe('Bridge', () => {
    describe('# constructor()', () => {
      it('Should throw if bridge url is empty', () => {
        expect(() => {
          new Bridge({
            bridgeUser: 'fake@user.com',
            bridgePass: 'fakePass',
            bridgeUrl: '',
            appDetails: { clientName: 'clientName', clientVersion: '1.0.0' },
          });
        }).to.throw('Empty bridge url');
      });
    });
  });
});
