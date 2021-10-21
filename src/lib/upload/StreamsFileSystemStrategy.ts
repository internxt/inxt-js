import { eachLimit } from 'async';
import { createReadStream, statSync } from 'fs';
import { Cipher, createCipheriv } from 'crypto';
import { Readable, pipeline } from 'stream';

import { HashStream } from '../hasher';
import { ShardMeta } from '../shardMeta';
import { determineConcurrency, determineShardSize } from '../utils';
import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import EncryptStream from '../encryptStream';
import { wrap } from '../utils/error';
import { generateMerkleTree } from '../merkleTreeStreams';
import { FunnelStream } from '../funnelStream';
import { ContractNegotiated } from '../contracts';
import { Events as UploaderQueueEvents, UploaderQueueV2 } from './UploadStream';
import { UploadTaskParams } from './UploadStream';
import { Tap } from '../TapStream';
import { Abortable } from '../../api/Abortable';
import { ShardObject } from '../../api/ShardObject';
import { Events } from '../../api/events';

export type MultipleStreamsStrategyObject = { label: 'MultipleStreams', params: Params };

interface Params extends UploadParams {
  filepath: string;
}

interface LocalShard {
  size: number;
  index: number;
  filepath: string;
}

export interface ContentAccessor {
  getStream(): Readable;
}

type LoggerFunction = (message: string, ...meta: any[]) => void;
interface Logger {
  debug: LoggerFunction;
  info: LoggerFunction;
  error: LoggerFunction;
}

export class StreamFileSystemStrategy extends UploadStrategy {
  private filepath: string;
  private ramUsage: number;

  private abortables: Abortable[] = [];
  private logger: Logger;

  constructor(params: Params, logger: Logger) {
    super();

    this.logger = logger;
    this.filepath = params.filepath;
    this.ramUsage = params.desiredRamUsage;
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

  private generateShardAccessors(filepath: string, nShards: number, shardSize: number, fileSize: number): (LocalShard & ContentAccessor)[] {
    const shards: (LocalShard & ContentAccessor)[] = [];

    for (let i = 0, shardIndex = 0; shardIndex < nShards; i += shardSize, shardIndex++) {
      const start = i;
      const end = Math.min(start + shardSize, fileSize);

      shards.push({
        getStream: () => {
          return createReadStream(filepath, { start, end: end - 1 });
        },
        filepath,
        index: shardIndex,
        size: end - start
      });

      this.logger.debug('Shard %s stream generated [byte %s to byte %s]', shardIndex, start, end - 1);
    }

    return shards;
  }

  // TODO: Extract this to a separate fn
  async negotiateContracts(shardMetas: ShardMeta[], negotiateContract: NegotiateContract): Promise<(ContractNegotiated & { shardIndex: number })[]> {
    const contracts: (ContractNegotiated & { shardIndex: number })[] = [];

    await eachLimit(shardMetas, 6, (shardMeta, next) => {
      this.logger.debug('Negotiating contract for shard %s', shardMeta.hash);

      negotiateContract(shardMeta).then((contract) => {
        contracts.push({ ...contract, shardIndex: shardMeta.index });
        next();
      }).catch((err) => {
        next(err);
      });
    });

    return contracts;
  }

  generateShardMetas(shards: (LocalShard & ContentAccessor)[]): Promise<ShardMeta[]> {
    const cipher = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);

    return generateShardMetas(shards, cipher);
  }

  async upload(negotiateContract: NegotiateContract): Promise<void> {
    this.emit(UploadEvents.Started);

    const fileSize = statSync(this.filepath).size;
    const shardSize = determineShardSize(fileSize);
    const nShards = Math.ceil(fileSize / shardSize);
    const concurrency = Math.min(determineConcurrency(this.ramUsage, fileSize), nShards);

    const shards = this.generateShardAccessors(this.filepath, nShards, shardSize, fileSize);
    const shardMetas = await this.generateShardMetas(shards);
    const contracts = await this.negotiateContracts(shardMetas, negotiateContract);

    // UPLOAD STARTS HERE
    const uploadTask = ({ stream: source, finishCb: cb, shardIndex }: UploadTaskParams) => {
      const contract = contracts.find(c => c.shardIndex === shardIndex);
      const shardMeta = shardMetas.find(s => s.index === shardIndex);
      const url = `http://${contract?.farmer.address}:${contract?.farmer.port}/upload/link/${shardMeta?.hash}`;

      return ShardObject.requestPut(url).then((putUrl) => {
        this.logger.debug('Streaming shard %s to %s', shardMeta?.hash, putUrl);

        return ShardObject.putStream(putUrl, source);
      }).then((res) => {
        console.log('res', res);
        this.logger.debug('Shard %s uploaded correctly', shardMeta?.hash);
        cb();
      }).catch((err) => {
        throw wrap('Shard upload error', err);
      });
    };

    const reader = createReadStream(this.filepath, { highWaterMark: 16384 });
    const tap = new Tap(shardSize * concurrency);
    const slicer = new FunnelStream(shardSize);
    const encrypter = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
    const uploader = new UploaderQueueV2(concurrency, nShards, uploadTask);

    this.abortables.push({
      abort: () => {
        try { reader.destroy() } catch {}
      }
    }, {
      abort: () => {
        try { tap.destroy() } catch {}
      }
    }, {
      abort: () => {
        try { slicer.destroy() } catch {}
      }
    }, {
      abort: () => {
        try { encrypter.destroy() } catch {}
      }
    }, {
      abort: () => {
        try { uploader.destroy() } catch {}
      }
    });

    console.log('tap allowing an influx of %s bytes', shardSize * concurrency);

    let uploads: number [] = [];

    uploader.on(UploaderQueueEvents.Progress, ([ shardIndex ]) => {
      const { hash, size } = shardMetas.find(s => s.index === shardIndex)!;
      this.emit(UploadEvents.ShardUploadSuccess, { hash, size });

      uploads.push(0);

      if (uploads.length === concurrency) {
        tap.open();
        uploads = [];
      }
    });

    uploader.once(UploaderQueueEvents.Error, ([ err ]) => {
      uploader.destroy();
      this.emit(UploadEvents.Error, wrap('Farmer request error', err));
    });

    uploader.once(UploaderQueueEvents.End, () => {
      uploader.destroy();
      this.emit(UploadEvents.Finished, { result: shardMetas });
    });

    const uploadPipeline = pipeline(reader, tap, slicer, encrypter, uploader.getUpstream(), (err) => {
      if (err) {
        this.emit(UploadEvents.Error, err);
        uploadPipeline.destroy();
      }
    });

    this.abortables.push({
      abort: () => {
        try { uploadPipeline.destroy() } catch {}
      }
    });
  }

  abort(): void {
    this.emit(Events.Upload.Abort);
    this.abortables.forEach((abortable) => {
      abortable.abort();
    });
  }
}

function calculateShardHash(shard: ContentAccessor, cipher: Cipher): Promise<string> {
  const hasher = new HashStream();

  // Avoid cipher to end (in order to reuse it later), using encrypt stream to wrap it
  const encrypter = new EncryptStream(Buffer.from(''), Buffer.from(''), cipher);

  return new Promise((resolve, reject) => {
    pipeline(shard.getStream(), encrypter, hasher, (err) => {
      if (err) {
        return reject(err);
      }
      resolve(hasher.getHash().toString('hex'));
    }).on('data', () => {
      // force data to flow
    });
  });
}

function generateShardMetas(shards: (LocalShard & ContentAccessor)[], cipher: Cipher): Promise<ShardMeta[]> {
  const shardMetas: ShardMeta[] = [];

  return eachLimit(shards, 1, (shard, next: (err?: Error) => void) => {
    generateShardMeta(shard, cipher).then((shardMeta) => {
      shardMetas.push(shardMeta);
      next();
    }).catch((err) => {
      next(err);
    });
  }).then(() => {
    return shardMetas;
  });
}

function generateShardMeta(shard: (LocalShard & ContentAccessor), cipher: Cipher): Promise<ShardMeta> {
  return calculateShardHash(shard, cipher).then((shardHash) => {
    const merkleTree = generateMerkleTree();

    return {
      hash: shardHash,
      size: shard.size,
      index: shard.index,
      parity: false,
      challenges_as_str: merkleTree.challenges_as_str,
      tree: merkleTree.leaf
    };
  });
}
