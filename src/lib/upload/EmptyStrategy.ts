import { NegotiateContract, UploadStrategy } from './UploadStrategy';

export class EmptyStrategy extends UploadStrategy {
  constructor() {
    super();
  }

  getIv(): Buffer {
    return this.iv;
  }

  getFileEncryptionKey() {
    return this.fileEncryptionKey;
  }

  setIv(iv: Buffer): void {
    this.iv = iv;
  }

  setFileEncryptionKey(fk: Buffer) {
    this.fileEncryptionKey = fk;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  upload(negotiateContract: NegotiateContract): void { null }

  abort(): void { null }
}
