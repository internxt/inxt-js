import { EventEmitter } from 'events';
import { Abortable } from '../../api/Abortable';
import { Shard } from '../../api/shard';

export enum DownloadEvents {
  Error = 'download-error',
  Start = 'download-start',
  Ready = 'download-ready',
  Progress = 'download-progress',
  Abort = 'download-abort',
  Finish = 'download-finish'
}

export abstract class DownloadStrategy extends EventEmitter implements Abortable {
  fileEncryptionKey = Buffer.alloc(0);
  iv = Buffer.alloc(0);

  /**
   * Should return the initialization vector used for file encryption
   */
  getIv(): Buffer {
    return this.iv;
  }

  /**
   * Should set the required iv to perform an encryption
   * @param iv Initialization vector used in file encryption
   */
  setIv(iv: Buffer): void {
    this.iv = iv;
  }

  /**
   * Should return the file encryption key
   */
  getFileEncryptionKey(): Buffer {
    return this.fileEncryptionKey;
  }

  /**
   * Should set the file encryption key
   * @param fk File encryption key used to encrypt a file
   */
  setFileEncryptionKey(fk: Buffer): void {
    this.fileEncryptionKey = fk;
  }

  /**
   * Should execute the steps to perform an upload
   * @param negotiateContract Injected method to negotiate a contract
   */
  abstract download(mirrors: Shard[]): Promise<void>;

  /**
   * Should abort the upload strategy as soon as possible
   */
  abstract abort(): void;
}
