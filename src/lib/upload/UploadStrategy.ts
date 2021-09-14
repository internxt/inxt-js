import { EventEmitter } from 'stream';
import { Abortable } from '../../api/Abortable';
import { ContractNegotiated } from '../contracts';
import { ShardMeta } from '../shardMeta';

export type NegotiateContract = (shardMeta: ShardMeta) => Promise<ContractNegotiated>;

export interface ShardUploadSuccessMessage {
  hash: string;
  size: number;
}

export interface UploadFinishedMessage {
  result: any;
}

export enum UploadEvents {
  Error = 'upload-error',
  Started = 'upload-start',
  Aborted = 'upload-aborted',
  Finished = 'upload-finished',
  ShardUploadSuccess = 'shard-upload-success',
}

export abstract class UploadStrategy extends EventEmitter implements Abortable {
  fileEncryptionKey = Buffer.alloc(0);
  iv = Buffer.alloc(0);
  abstract getIv(): Buffer;
  abstract setIv(iv: Buffer): void;
  abstract getFileEncryptionKey(): Buffer;
  abstract setFileEncryptionKey(fk: Buffer): void;
  abstract upload(negotiateContract: NegotiateContract): void;
  abstract abort(): void;
}

export interface UploadParams {
  desiredRamUsage: number;
}
