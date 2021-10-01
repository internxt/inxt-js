import EventEmitter from 'events';
import { createCipheriv } from 'crypto';
import { Duplex, pipeline, Readable, Writable } from 'stream';

import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import { generateMerkleTree } from '../merkleTreeStreams';
import { Abortable } from '../../api/Abortable';
import { ShardObject } from '../../api/ShardObject';
import { wrap } from '../utils/error';
import { Events as ProgressEvents, ProgressNotifier } from '../streams';
import AbortController from 'abort-controller';
import { Contract } from '../../api';
import { queue } from 'async';
import { determineShardSize } from '../utils';
import { FunnelStream } from '../funnelStream';
import { Tap } from '../TapStream';
import { HashStream } from '../hasher';
import { ShardMeta } from '../shardMeta';
import { ContractNegotiated } from '../contracts';

interface Source {
  size: number;
  hash: string;
  stream: Readable;
}

export type OneStreamStrategyObject = { label: 'OneStreamOnly', params: Params };

interface Params extends UploadParams {
  source: Source;
}

// export class OneStreamStrategy extends UploadStrategy {
//   private source: Source;
//   private abortables: Abortable[] = [];

//   constructor(params: Params) {
//     super();

//     this.source = params.source;
//   }

//   getIv(): Buffer {
//     return this.iv;
//   }

//   getFileEncryptionKey() {
//     return this.fileEncryptionKey;
//   }

//   setIv(iv: Buffer): void {
//     this.iv = iv;
//   }

//   setFileEncryptionKey(fk: Buffer) {
//     this.fileEncryptionKey = fk;
//   }

//   async upload(negotiateContract: NegotiateContract): Promise<void> {
//     try {
//       this.emit(UploadEvents.Started);

//       const merkleTree = generateMerkleTree();
//       const shardMeta = {
//         hash: this.source.hash,
//         size: this.source.size,
//         index: 0,
//         parity: false,
//         challenges_as_str: merkleTree.challenges_as_str,
//         tree: merkleTree.leaf
//       };

//       const contract = await negotiateContract(shardMeta);
//       const url = Contract.buildRequestUrl(contract);

//       const encrypter = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
//       const progressNotifier = new ProgressNotifier(this.source.size);

//       progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
//         this.emit(UploadEvents.Progress, progress);
//       });

//       const putUrl = await ShardObject.requestPut(url);
//       const uploadPipeline = pipeline(this.source.stream, encrypter, progressNotifier, (err) => {
//         if (err) {
//           uploadPipeline.destroy();
//           this.emit(UploadEvents.Error, wrap('OneStreamStrategyError', err));
//         }
//       });

//       const controller = new AbortController();

//       this.addToAbortables(() => uploadPipeline.destroy());
//       this.addToAbortables(() => controller.abort());

//       await ShardObject.putStream(putUrl, uploadPipeline, controller);

//       this.emit(UploadEvents.Finished, { result: [shardMeta] });

//       cleanStreams([ progressNotifier, uploadPipeline, encrypter, this.source.stream ]);
//       cleanEventEmitters([ this ]);
//     } catch (err) {
//       this.emit(UploadEvents.Error, wrap('OneStreamStrategyError', err as Error));
//     }
//   }

//   private addToAbortables(abortFunction: () => void) {
//     this.abortables.push({ abort: abortFunction });
//   }

//   abort(): void {
//     this.emit(UploadEvents.Aborted);
//     this.abortables.forEach((abortable) => abortable.abort());
//     this.removeAllListeners();
//   }
// }

// function cleanEventEmitters(emitters: EventEmitter[]) {
//   emitters.forEach(e => e.removeAllListeners());
// }

// function cleanStreams(streams: (Readable | Writable | Duplex)[]) {
//   cleanEventEmitters(streams);
//   streams.forEach(s => {
//     if (!s.destroyed) {
//       s.destroy();
//     }
//   });
// }


export class OneStreamStrategy extends UploadStrategy {
  private source: Source;
  private abortables: Abortable[] = [];
  private internalBuffer: Buffer[] = [];
  private shardMetas: ShardMeta[] = [];

  constructor(params: Params) {
    super();

    this.source = params.source;
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

  async upload(negotiateContract: NegotiateContract): Promise<void> {
    try {
      this.emit(UploadEvents.Started);

      const concurrency = 1;
      const cipher = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const fileSize = this.source.size;
      const shardSize = determineShardSize(fileSize);
      const readable = this.source.stream;
      const tap = new Tap(shardSize);
      const hasher = new HashStream();

      const uploadPipeline = readable.pipe(cipher).pipe(tap).pipe(hasher);

      let currentShardIndex = 0;
      let concurrentTasks = 0;
      let finishedTasks = 0;

      uploadPipeline.on('data', (shard: Buffer) => {
        concurrentTasks++;

        console.log('data', shard && shard.slice(0, 4).toString('hex'))

        this.internalBuffer.push(shard);

        const mTree = generateMerkleTree();
        const shardMeta: ShardMeta = {
          hash: hasher.getHash().toString('hex'),
          index: currentShardIndex,
          parity: false,
          size: shard.length,
          tree: mTree.leaf,
          challenges_as_str: mTree.challenges_as_str
        };

        this.shardMetas.push(shardMeta);

        hasher.reset();

        uploadQueue.push(shardMeta, () => {
          finishedTasks++;

          console.log('concurrentTasks %s | finishedTasks %s', concurrentTasks, finishedTasks);

          if (finishedTasks === concurrentTasks) {
            tap.open();
            finishedTasks = 0;
            concurrentTasks = 0;
          }
        });
      });

      const uploadQueue = queue<ShardMeta>((shardMeta, next) => {
        negotiateContract(shardMeta).then((contract) => {
          this.uploadShard(shardMeta, contract, (err) => {
            if (err) {
              return next(err);
            }

            this.internalBuffer[shardMeta.index] = Buffer.alloc(0);

            this.emit(UploadEvents.Progress, shardSize / fileSize);

            next();
          });
        });
      }, concurrency);

      // const progressNotifier = new ProgressNotifier(this.source.size);

      // progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
      //   this.emit(UploadEvents.Progress, progress);
      // });

      this.addToAbortables(() => uploadPipeline.destroy());

      // this.emit(UploadEvents.Finished, { result: this.shardMetas });

      // cleanStreams([ progressNotifier, uploadPipeline, encrypter, this.source.stream ]);
      // cleanEventEmitters([ this ]);
    } catch (err) {
      this.emit(UploadEvents.Error, wrap('OneStreamStrategyError', err as Error));
    }
  }

  private uploadShard(shardMeta: ShardMeta, contract: ContractNegotiated, cb: (err?: Error) => void) {
    const url = `http://${contract.farmer.address}:${contract.farmer.port}/upload/link/${shardMeta.hash}`;
    const controller = new AbortController();

    return ShardObject.requestPut(url).then((putUrl) => {
      return ShardObject.putStream(putUrl, Readable.from(this.internalBuffer[shardMeta.index]), controller);
    }).then(() => {
      cb();
    }).catch((err) => {
      cb(err);
    });
  }

  private addToAbortables(abortFunction: () => void) {
    this.abortables.push({ abort: abortFunction });
  }

  abort(): void {
    this.emit(UploadEvents.Aborted);
    this.abortables.forEach((abortable) => abortable.abort());
    this.removeAllListeners();
  }
}

function cleanEventEmitters(emitters: EventEmitter[]) {
  emitters.forEach(e => e.removeAllListeners());
}

function cleanStreams(streams: (Readable | Writable | Duplex)[]) {
  cleanEventEmitters(streams);
  streams.forEach(s => {
    if (!s.destroyed) {
      s.destroy();
    }
  });
}
