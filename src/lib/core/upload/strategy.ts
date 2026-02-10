import { EventEmitter } from 'events';

import { UploadOneStreamStrategyObject, UploadOneShardStrategyObject, UploadOptions } from '.';
import { Abortable, ActionState, ContractMeta } from '../../../api';
import { ShardMeta } from '../../models';

export type NegotiateContract = (shardMeta: ShardMeta) => Promise<ContractMeta>;

export interface UploadFinishedMessage {
  result: ShardMeta[];
}

export type UploadStrategyLabel = string;

export type UploadStrategyObject = UploadOneStreamStrategyObject | UploadOneShardStrategyObject;

export type UploadStrategyFunction = (bucketId: string, opts: UploadOptions) => ActionState;

export abstract class UploadStrategy extends EventEmitter implements Abortable {
  fileEncryptionKey: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  iv: Buffer<ArrayBufferLike> = Buffer.alloc(0);

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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UploadParams {}
