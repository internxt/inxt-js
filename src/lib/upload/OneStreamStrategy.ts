import { queue, retry } from 'async';
import { createCipheriv, createHash } from 'crypto';
import { Readable } from 'stream';

import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import { generateMerkleTree } from '../merkleTreeStreams';
import { Abortable } from '../../api/Abortable';
import { ShardObject } from '../../api/ShardObject';
import { wrap } from '../utils/error';
import { determineShardSize } from '../utils';
import { Tap } from '../TapStream';
import { ShardMeta } from '../shardMeta';
import { ContractNegotiated } from '../contracts';
import { FunnelStream } from '../funnelStream';
import { logger } from '../utils/logger';
import { Events } from '../../api/events';

interface Source {
  size: number;
  hash: string;
  stream: Readable;
}

export type OneStreamStrategyObject = { label: 'OneStreamOnly', params: Params };

interface Params extends UploadParams {
  source: Source;
}

/**
 * TODO:  
 * - Fix progress notification. 
 * - Test parallelism. 
 * - Clean shardmeta array whenever is possible.
 * - Error handling
 * - Tests
 */

/**
 * TODO: Bug -> Upload is finished before all uploads finishes (check line 150)
 */
export class OneStreamStrategy extends UploadStrategy {
  private source: Source;
  private abortables: Abortable[] = [];
  private internalBuffer: Buffer[] = [];
  private shardMetas: ShardMeta[] = [];

  private uploadsProgress: number[] = [];
  private progressIntervalId: NodeJS.Timeout = setTimeout(() => { });

  constructor(params: Params) {
    super();

    this.source = params.source;
    this.startProgressInterval();
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

  private startProgressInterval() {
    this.progressIntervalId = setInterval(() => {
      const currentProgress = this.uploadsProgress.reduce((acumm, progress) => acumm + progress, 0) / this.uploadsProgress.length;
      this.emit(Events.Upload.Progress, currentProgress);
    }, 5000);
  }

  private stopProgressInterval() {
    clearInterval(this.progressIntervalId);
  }

  async upload(negotiateContract: NegotiateContract): Promise<void> {
    try {
      this.emit(UploadEvents.Started);

      console.log('fk: %s', this.fileEncryptionKey.toString('hex'));
      console.log('iv: %s', this.iv.toString('hex'));

      const concurrency = 2;
      const cipher = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const fileSize = this.source.size;
      const shardSize = determineShardSize(fileSize);
      const readable = this.source.stream;
      const tap = new Tap(concurrency * shardSize);
      const funnel = new FunnelStream(shardSize);
      const nShards = Math.ceil(fileSize / shardSize);

      this.uploadsProgress = new Array(nShards).fill(0);

      logger.debug('Slicing file in %s shards', nShards);

      const uploadPipeline = readable.pipe(cipher).pipe(tap).pipe(funnel);
      this.addToAbortables(() => uploadPipeline.destroy());

      let currentShards: any[] = [];
      let concurrentTasks: any[] = [];
      let finishedTasks: any[] = [];
      let totalFinishedTasks: any[] = [];

      const uploadQueue = queue<ShardMeta>((shardMeta, next) => {
        retry({ times: 3, interval: 500 }, (nextTry) => {
          logger.debug('Negotiating contract for shard %s, hash %s', shardMeta.index, shardMeta.hash);

          negotiateContract(shardMeta).then((contract) => {
            logger.debug('Negotiated contract for shard %s. Uploading ...', shardMeta.index);

            this.uploadShard(shardMeta, contract, (err) => {
              if (err) {
                return nextTry(err);
              }

              this.internalBuffer[shardMeta.index] = Buffer.alloc(0);
              this.uploadsProgress[shardMeta.index] = 1;

              nextTry();
            });
          }).catch((err) => {
            nextTry(err);
          });
        }, (err: Error | null | undefined) => {
          if (err) {
            return next(err);
          }
          next(null);
        });
      }, concurrency);

      this.addToAbortables(() => uploadQueue.kill());

      await new Promise((resolve, reject) => {
        uploadPipeline.on('data', (shard: Buffer) => {
          const currentShardIndex = currentShards.length;

          this.internalBuffer[currentShardIndex] = Buffer.from(shard);

          /**
           * TODO: calculate shard hash on the fly with a stream
           */
          const mTree = generateMerkleTree();
          const shardMeta: ShardMeta = {
            hash: calculateShardHash(shard).toString('hex'),
            index: currentShardIndex,
            parity: false,
            size: shard.length,
            tree: mTree.leaf,
            challenges_as_str: mTree.challenges_as_str
          };

          this.shardMetas.push(shardMeta);

          concurrentTasks.push(0);
          currentShards.push(0);

          uploadQueue.push(shardMeta, (err) => {
            totalFinishedTasks.push(0);
            finishedTasks.push(0);

            if (err) {
              return reject(err);
            }

            if (totalFinishedTasks.length === nShards) {
              this.cleanup();
              resolve(null);
              return this.emit(UploadEvents.Finished, { result: this.shardMetas });
            }

            if (finishedTasks.length === concurrentTasks.length) {
              tap.open();
              finishedTasks = [];
              concurrentTasks = [];
            }
          });
        });
      });
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  private uploadShard(shardMeta: ShardMeta, contract: ContractNegotiated, cb: (err?: Error) => void) {
    const url = `http://${contract.farmer.address}:${contract.farmer.port}/upload/link/${shardMeta.hash}`;

    console.log('uploadShard %s', shardMeta.index);

    ShardObject.requestPutTwo(url, (err, putUrl) => {
      if (err) {
        return cb(err);
      }

      ShardObject.putStreamTwo(putUrl, Readable.from(this.internalBuffer[shardMeta.index]), (err) => {
        console.log('XXX err for shard %s', err?.message, shardMeta.index);
        if (err) {
          // TODO: Si el error es un 304, hay que dar el shard por subido.
          return cb(err);
        }

        return cb();
      });
    });
  }

  private addToAbortables(abortFunction: () => void) {
    this.abortables.push({ abort: abortFunction });
  }

  private handleError(err: Error) {
    this.abortables.forEach((abortable) => abortable.abort());

    this.emit(Events.Upload.Error, wrap('OneStreamStrategyError', err as Error));
  }

  abort(): void {
    this.emit(Events.Upload.Abort);
    this.abortables.forEach((abortable) => abortable.abort());
    this.removeAllListeners();
  }

  cleanup() {
    this.stopProgressInterval();
  }
}

function calculateShardHash(shard: Buffer): Buffer {
  return createHash('ripemd160').update(
    createHash('sha256').update(shard).digest()
  ).digest();
}
