import { EventEmitter } from 'events';
import { Abortable } from '../../api/Abortable';
import { ContractNegotiated } from '../contracts';
import { ShardMeta } from '../shardMeta';

export type NegotiateContract = (shardMeta: ShardMeta) => Promise<ContractNegotiated>;

export interface ShardUploadSuccessMessage {
  hash: string;
  size: number;
}

export interface UploadFinishedMessage {
  result: ShardMeta[];
}

export enum UploadEvents {
  Error = 'upload-error',
  Started = 'upload-start',
  Progress = 'upload-progress',
  Abort = 'upload-aborted',
  Finished = 'upload-finished',
  ShardUploadSuccess = 'shard-upload-success',
}

export abstract class UploadStrategy extends EventEmitter implements Abortable {
  fileEncryptionKey = Buffer.alloc(0);
  iv = Buffer.alloc(0);

  /**
   * Should return the initialization vector used for file encryption
   */
  abstract getIv(): Buffer;

  /**
   * Should set the required iv to perform an encryption
   * @param iv Initialization vector used in file encryption
   */
  abstract setIv(iv: Buffer): void;

  /**
   * Should return the file encryption key
   */
  abstract getFileEncryptionKey(): Buffer;

  /**
   * Should set the file encryption key
   * @param fk File encryption key used to encrypt a file
   */
  abstract setFileEncryptionKey(fk: Buffer): void;

  /**
   * Should execute the steps to perform an upload
   * @param negotiateContract Injected method to negotiate a contract
   */
  abstract upload(negotiateContract: NegotiateContract): void;

  /**
   * Should abort the upload strategy as soon as possible
   */
  abstract abort(): void;
}

export interface UploadParams {}
