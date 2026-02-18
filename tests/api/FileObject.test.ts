import { beforeEach, describe, expect, it } from 'vitest';

import { FileObject } from '../../src/api';
import { DownloadOneShardStrategy, DownloadOneShardStrategyParams } from '../../src/lib/core';

let fileObject: FileObject;

describe('# FileObject', () => {
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
      new DownloadOneShardStrategy({} as DownloadOneShardStrategyParams),
    );
  });

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
