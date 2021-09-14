import https from 'https';
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

export class StreamFileSystemStrategy extends UploadStrategy {
  private filepath: string;
  private ramUsage: number;

  constructor(params: Params) {
    super();

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

  static streamShardToNodeV2(params: { hostname: string, path: string, stream: Readable }): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request({
        protocol: 'https:',
        method: 'POST',
        hostname: params.hostname,
        path: params.path,
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }, (res: IncomingMessage) => {
        console.log(`statusCode: ${res.statusCode}`);
  
        res.on('error', (err) => {
          console.log(err);
          reject(err);
        })
  
        res.on('data', d => {
          process.stdout.write(d);
        });
  
        res.on('end', () => {
          resolve();
        });
      });

      params.stream.pipe(req);
    });
  }

  private generateShardAccessors(filepath: string, nShards: number, shardSize: number, fileSize: number): (LocalShard & ContentAccessor)[] {
    const shards: (LocalShard & ContentAccessor)[] = [];

    for (let i = 0, shardIndex = 0; shardIndex < nShards; i += shardSize, shardIndex++) {
      const start = i;
      // const end = Math.min(start + shardSize - 1, fileSize);
      const end = Math.min(start + shardSize, fileSize);

      shards.push({
        getStream: () => {
          return createReadStream(filepath, { start, end: end - 1 });
        },
        filepath,
        index: shardIndex,
        size: end - start
        // cuando todos los trozos tienen shardSize, necesita un + 1
        // cuando el ultimo no tiene shardSize, no necesita un +1
      });

      console.log('Shard %s stream generated [byte %s to byte %s]', shardIndex, start, end);
    }

    return shards;
  }

  calculateShardHash(shard: ContentAccessor, cipher: Cipher): Promise<string> {
    const hasher = new HashStream();
    const encrypter = new EncryptStream(this.fileEncryptionKey, this.iv, cipher);

    return new Promise((resolve, reject) => {
      pipeline(shard.getStream(), encrypter, hasher, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(hasher.getHash().toString('hex'));
      }).on('data', () => {}) // force pipeline to change to flowing mode
    });
  }

  // TODO: Extract this to a separate fn
  async negotiateContracts(shardMetas: ShardMeta[], negotiateContract: NegotiateContract): Promise<(ContractNegotiated & { shardIndex: number })[]> {
    const contracts: (ContractNegotiated & { shardIndex: number })[] = [];

    await eachLimit(shardMetas, 6, (shardMeta, next) => {
      negotiateContract(shardMeta).then((contract) => {
        contracts.push({ ...contract, shardIndex: shardMeta.index });
        next();
      }).catch((err) => {
        next(err);
      });
    });

    return contracts;
  }

  async upload(negotiateContract: NegotiateContract): Promise<void> {
    this.emit(UploadEvents.Started);

    const fileSize = statSync(this.filepath).size;
    const shardSize = determineShardSize(fileSize);
    const nShards = Math.ceil(fileSize / shardSize);
    const concurrency = Math.min(determineConcurrency(this.ramUsage, fileSize), nShards);

    const cipher = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
    const shards = this.generateShardAccessors(this.filepath, nShards, shardSize, fileSize);
    const shardMetas: ShardMeta[] = [];

    await eachLimit(shards, 1, async (shard, next: (err?: unknown) => void) => {
      try {
        const shardHash = await this.calculateShardHash(shard, cipher);
        console.log('Shard %s: Hash %s', shard.index, shardHash);

        const merkleTree = generateMerkleTree();

        const shardMeta = {
          hash: shardHash,
          size: shard.size,
          index: shard.index,
          parity: false,
          challenges_as_str: merkleTree.challenges_as_str,
          tree: merkleTree.leaf
        };

        shardMetas.push(shardMeta);
        next();
      } catch (err) {
        next(err);
      }
    });

    const contracts = await this.negotiateContracts(shardMetas, negotiateContract);

    function getPath(shardIndex: number) {
      const contract = contracts.find(c => c.shardIndex === shardIndex);
      const shardMeta = shardMetas.find(s => s.index === shardIndex);
      const path = `/http://${contract?.farmer.address}:${contract?.farmer.port}/shards/${shardMeta?.hash}?token=${contract?.token}`;

      return path;
    }

    function getHostname() {
      return 'proxy01.api.internxt.com';
    }

    const uploadTask = (content: UploadTaskParams) => {
      return StreamFileSystemStrategy.streamShardToNodeV2(content).then(() => {
        content.finishCb();
      }).catch((err) => {
        console.log('err', err);
      });
    };

    const reader = createReadStream(this.filepath, { /* highWaterMark: 16384 */ });
    const tap = new Tap(shardSize * concurrency);
    const slicer = new FunnelStream(shardSize);
    const encrypter = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
    const uploader = new UploaderQueueV2(concurrency, nShards, uploadTask, getPath, getHostname);

    console.log('tap allowing an influx of %s bytes', shardSize * concurrency);

    let uploads: number [] = [];

    uploader.on(UploaderQueueEvents.Progress, ([ shardIndex ]) => {
      const shardMeta = shardMetas.find(s => s.index === shardIndex);
      this.emit(UploadEvents.ShardUploadSuccess, {
        hash: shardMeta?.hash,
        size: shardMeta?.size
      });

      uploads.push(0);

      if (uploads.length === concurrency) {
        tap.open();
        uploads = [];
      }
    });

    uploader.once(UploaderQueueEvents.Error, ([ err ]) => {
      uploader.removeAllListeners();
      this.emit(UploadEvents.Error, wrap('Farmer request error', err));
    });

    uploader.once(UploaderQueueEvents.End, () => {
      uploader.removeAllListeners();
      this.emit(UploadEvents.Finished, { result: shardMetas });
    });

    const uploadPipeline = pipeline(reader, tap, slicer, encrypter, uploader.getUpstream(), (err) => {
      if (err) {
        this.emit(UploadEvents.Error, err);
        uploadPipeline.destroy();
      }
    });
  }

  abort(): void {
    this.emit(UploadEvents.Aborted);
  }
}
