import { expect } from 'chai';
import { EncryptFilename, DecryptFileName, GenerateBucketKey } from '../../src/lib/crypto';

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const bucketId = '0123456789abcdef0000';

describe('# crypto', () => {
  it('should properly create bucket key', async () => {
    const bucketKey = await GenerateBucketKey(mnemonic, bucketId);
    // From NODE-LIB
    const expected = '726a02ad035960f8b6563497557bb8efe15cdb160ffb40541102c92c89262a00';
    expect(bucketKey).to.be.equals(expected);
  });

  it('should properly encrypt filename', async () => {
    const encrypted = await EncryptFilename(mnemonic, bucketId, 'dummy_filename0123456.xyz');
    // Digested IV (from NODE-LIB)
    const expectedIv = Buffer.from('11ee8cdfa36ac19dcb6d348a4b0bd53a1c9782d2c6e1718d38f9b91bab244258', 'hex');
    const iv = Buffer.from(encrypted, 'base64').slice(16, 48);
    expect(iv).eql(expectedIv);
    // Expected result (From NODE-LIB)
    const expectedResult =
      'BzWLgZkGLrMR820uXDi0rBHujN+jasGdy200iksL1Tocl4LSxuFxjTj5uRurJEJYdwMYXlfhnQsvfBdzn2tXV7bewyEe6QLoeQ==';
    expect(encrypted).to.be.equals(expectedResult);
  });

  it('should decrypt filename', async () => {
    const encryptedFilename =
      'BzWLgZkGLrMR820uXDi0rBHujN+jasGdy200iksL1Tocl4LSxuFxjTj5uRurJEJYdwMYXlfhnQsvfBdzn2tXV7bewyEe6QLoeQ==';
    const decrypted = await DecryptFileName(mnemonic, bucketId, encryptedFilename);
    expect(decrypted).to.be.equals('dummy_filename0123456.xyz');
  });
});
