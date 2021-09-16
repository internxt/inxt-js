import EventEmitter from 'events';
import { createCipheriv } from 'crypto';
import { Duplex, pipeline, Readable, Writable } from 'stream';

import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import { generateMerkleTree } from '../merkleTreeStreams';
import { Abortable } from '../../api/Abortable';
import { ShardObject } from '../../api/ShardObject';
import { ContractNegotiated } from '../contracts';
import { wrap } from '../utils/error';
import { Events as ProgressEvents, ProgressNotifier } from '../streams';

interface Source {
  size: number;
  hash: string;
  stream: Readable;
}

export interface Params extends UploadParams {
  source: Source;
}

export class OneStreamStrategy extends UploadStrategy {
  private source: Source;
  private abortables: Abortable[] = [];

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

      const merkleTree = generateMerkleTree();
      const shardMeta = {
        hash: this.source.hash,
        size: this.source.size,
        index: 0,
        parity: false,
        challenges_as_str: merkleTree.challenges_as_str,
        tree: merkleTree.leaf
      };

      const contract = await negotiateContract(shardMeta);
      const url = buildUrlFromContract(contract);

      const encrypter = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const progressNotifier = new ProgressNotifier(this.source.size);

      progressNotifier.on(ProgressEvents.Progress, (progress: number) => {
        this.emit(UploadEvents.Progress, progress);
      });

      const putUrl = await ShardObject.requestPut(url);
      const uploadPipeline = pipeline(this.source.stream, encrypter, progressNotifier, (err) => {
        if (err) {
          uploadPipeline.destroy();
          this.emit(UploadEvents.Error, wrap('OneStreamStrategyUploadError', err));
        }
      });

      this.abortables.push({ abort: () => uploadPipeline.destroy() });

      await ShardObject.putStream(putUrl, uploadPipeline);

      this.emit(UploadEvents.Finished, { result: [shardMeta] });

      cleanStreams([ progressNotifier, uploadPipeline, encrypter, this.source.stream ]);
      cleanEventEmitters([ this ]);
    } catch (err) {
      this.emit(UploadEvents.Error);
    }
  }

  abort(): void {
    this.emit(UploadEvents.Aborted);
    this.abortables.forEach((abortable) => {
      abortable.abort();
    });
  }
}

function buildUrlFromContract(contract: ContractNegotiated) {
  return `http://${contract.farmer.address}:${contract.farmer.port}/upload/link/${contract.hash}`;
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
