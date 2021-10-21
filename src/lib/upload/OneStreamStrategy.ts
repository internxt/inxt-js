import { queue } from 'async';
import EventEmitter from 'events';
import { createCipheriv, createHash } from 'crypto';
import { Duplex, Readable, Writable } from 'stream';

import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import { generateMerkleTree } from '../merkleTreeStreams';
import { Abortable } from '../../api/Abortable';
import { ShardObject } from '../../api/ShardObject';
import { wrap } from '../utils/error';
import { determineShardSize } from '../utils';
import { Tap } from '../TapStream';
import { HashStream } from '../hasher';
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

      let currentShards: any[] = [];
      let concurrentTasks: any[] = [];
      let finishedTasks: any[] = [];
      let totalFinishedTasks: any[] = [];

      console.log('shardSize', shardSize);

      uploadPipeline.on('data', (shard: Buffer) => {
        const currentShardIndex = currentShards.length;

        this.internalBuffer[currentShardIndex] = Buffer.from(shard);

        // console.log('ONDATA', { 
        //   start: shard.slice(0, 4), 
        //   end: shard.slice(shard.length - 4),
        //   index: currentShardIndex
        // });

        // console.log('stored on index %s is %s', currentShardIndex, this.internalBuffer[currentShardIndex].slice(0, 4).toString('hex'));

        const hash = createHash('ripemd160').update(
          createHash('sha256').update(shard).digest()
        ).digest('hex');

        const mTree = generateMerkleTree();
        const shardMeta: ShardMeta = {
          hash,
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
            // return this.emit(Events.Upload.)
            console.log('error during upload, killing queue');
            console.log(err);
            /**
             * TODO: Cleanup here
            */
            return uploadQueue.kill();
          }

          /**
           * TODO: BUG
           * What if the currentShardIndex finishes before the currentShardIndex - n upload?
           * Better check for total finished tasks
           */
          if (totalFinishedTasks.length === nShards) {
            return this.emit(UploadEvents.Finished, { result: this.shardMetas });
          }

          console.log('concurrentTasks %s | finishedTasks %s', concurrentTasks, finishedTasks);

          if (finishedTasks.length === concurrentTasks.length) {
            tap.open();
            finishedTasks = [];
            concurrentTasks = [];
          }
        });
      });

      const uploadQueue = queue<ShardMeta>((shardMeta, next) => {
        logger.debug('Processing shard %s, hash %s', shardMeta.index, shardMeta.hash);

        // console.log('shardMeta', JSON.stringify(shardMeta, null, 2));

        negotiateContract(shardMeta).then((contract) => {
          console.log('Calling to upload shard for shard %s', shardMeta.index);
          this.uploadShard(shardMeta, contract, (err) => {
            if (err) {
              return next(err);
            }

            console.log('cleaning shard %s', shardMeta.index);

            this.internalBuffer[shardMeta.index] = Buffer.alloc(0);

            /* TODO: Count total progress here and notify it different */
            this.emit(UploadEvents.Progress, shardMeta.size / fileSize);

            next();
          });
        }).catch((err) => {
          console.log('error here', err);
          next(err);
        })
      }, concurrency);

      this.addToAbortables(() => uploadPipeline.destroy());
    } catch (err) {
      this.emit(UploadEvents.Error, wrap('OneStreamStrategyError', err as Error));
    }
  }

  private uploadShard(shardMeta: ShardMeta, contract: ContractNegotiated, cb: (err?: Error) => void) {
    const url = `http://${contract.farmer.address}:${contract.farmer.port}/upload/link/${shardMeta.hash}`;

    // console.log('uploading shard man!! shard %s', shardMeta.index);

    return ShardObject.requestPut(url).then((url) => {
      // console.log('PUT REQUESTED for shard %s', shardMeta.index);
      return new Promise((resolve, reject) => {
        ShardObject.putStreamTwo(url, Readable.from(this.internalBuffer[shardMeta.index]), (err) => {
          console.log('XXX err for shard %s', err?.message, shardMeta.index);
          if (err) {
            return reject(err);
          }

          return resolve(null);
        });
      });
    }).then((res) => {
      console.log('calling callback fro shard %s', shardMeta.index);
      // if (res.status 200)
      cb();
    }).catch((err) => {
      // TODO: Si el error es un 304, hay que dar el shard por subido.
      console.log('calling callback for shard %s with error', shardMeta.index);
      console.log('ERROR', err);
      cb(err);
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

function cleanStreams(streams: (Readable | Writable | Duplex)[]) {
  cleanEventEmitters(streams);
  streams.forEach(s => {
    if (!s.destroyed) {
      s.destroy();
    }
  });
}
