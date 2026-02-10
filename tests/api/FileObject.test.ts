import { createStubInstance } from 'sinon';

import { FileObject } from '../../src/api';
import { DownloadStrategy } from '../../src/lib/core';

let fileObject: FileObject;

beforeEach(() => {
  fileObject = new FileObject(
    {
      bridgePass: '',
      bridgeUser: '',
      bridgeUrl: '',
      appDetails: {
        clientName: '',
        clientVersion: '',
      },
    },
    '',
    '',
    createStubInstance(DownloadStrategy),
  );
});

describe('# FileObject', () => {
  it('Should set the file encryption key', () => {
    const fk = Buffer.from('fk');

    fileObject.setFileEncryptionKey(fk);

    expect(fileObject.fileKey).toStrictEqual(fk);
  });

  it('Should set the file token', () => {
    const fileToken = 'token';

    fileObject.setFileToken(fileToken);

    expect(fileObject.fileToken).toStrictEqual(fileToken);
  });

  it('Should abort correctly', () => {
    fileObject.abort();

    expect(fileObject.isAborted()).toBeTruthy();
  });
});
