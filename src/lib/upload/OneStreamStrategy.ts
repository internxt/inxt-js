import { createCipheriv } from 'crypto';
import { pipeline, Readable, Transform, TransformOptions } from 'stream';

import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import { generateMerkleTree } from '../merkleTreeStreams';
import { Abortable } from '../../api/Abortable';
import { ShardObject } from '../../api/ShardObject';
import { ContractNegotiated } from '../contracts';
import { wrap } from '../utils/error';

interface Source {
  size: number
  hash: string
  stream: Readable
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
      const progress = new ProgressStream(this.source.size);

      progress.on(ProgressEvents.Progress, (progress: number) => {
        console.log('progress: %s', progress);
        this.emit(UploadEvents.ShardUploadSuccess);
      });

      const putUrl = await ShardObject.requestPut(url);
      const uploadPipeline = pipeline(this.source.stream, encrypter, progress, (err) => {
        if (err) {
          uploadPipeline.destroy();
          this.emit(UploadEvents.Error, wrap('OneStreamStrategyUploadError', err));
        }
      });

      this.abortables.push({ abort: () => uploadPipeline.destroy() });

      await ShardObject.putStream(putUrl, uploadPipeline);

      this.emit(UploadEvents.Finished, { result: [shardMeta] });
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

enum ProgressEvents {
  Progress = 'progress'
}

class ProgressStream extends Transform {
  private readBytes = 0;
  private progressInterval: NodeJS.Timeout;

  constructor(totalBytes: number, opts?: TransformOptions) {
    super(opts);

    this.progressInterval = setInterval(() => {
      this.emit(ProgressEvents.Progress, this.readBytes / totalBytes);
    }, 100);
  }

  _transform(chunk: Buffer, enc: string, cb: (err: Error | null, data: Buffer) => void) {
    this.readBytes += chunk.length;

    cb(null, chunk);
  }

  _flush(cb: (err: Error | null) => void) {
    clearInterval(this.progressInterval);
    cb(null);
  }
}