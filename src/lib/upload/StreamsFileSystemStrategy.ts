import https from 'https';
import { eachLimit } from 'async';
import { createReadStream, statSync } from 'fs';

import { HashStream } from '../hasher';
import { ShardMeta } from '../shardMeta';
import { determineConcurrency, determineShardSize } from '../utils';
import { NegotiateContract, UploadEvents, UploadParams, UploadStrategy } from './UploadStrategy';
import EncryptStream from '../encryptStream';
import { wrap } from '../utils/error';
import { Readable } from 'stream';
import { generateMerkleTree } from '../merkleTreeStreams';

interface Params extends UploadParams {
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

  async upload(negotiateContract: NegotiateContract): Promise<void> {
    this.emit(UploadEvents.Started);

    interface LocalShard {
      size: number;
      index: number;
      start: number;
      end: number;
      filepath: string;
    }

    const fileSize = statSync(this.filepath).size;
    const shardSize = determineShardSize(fileSize);
    const nShards = Math.ceil(fileSize / shardSize);
    const shards: (ContentAccessor & LocalShard)[] = [];
    const concurrency = Math.min(determineConcurrency(this.ramUsage, fileSize), nShards);

    for (let i = 0, shardIndex = 0; i < nShards; i += shardSize, shardIndex++) {
      const start = i;
      const end = i + shardSize - 1 > fileSize ? fileSize : i + shardSize - 1;

      shards.push({
        getStream: () => {
          return createReadStream(this.filepath, { start, end });
        },
        size: end - start,
        index: shardIndex,
        start,
        end,
        filepath: this.filepath
      });

      console.log('Shard %s stream generated [byte %s to byte %s]', shardIndex, start, end);
    }

    const shardMetas: ShardMeta[] = [];

    // TODO: use concurrency instead of 1
    // TODO: add retry 3 times
    // TODO: add upload progress callback
    await eachLimit(shards, 1, (shard, next) => {
      let shardMeta: ShardMeta;

      const hashStream = new HashStream();

      // 1. Encriptar shard
      // 2. Calcular hash
      new Promise((resolve, reject) => {
        shard.getStream().pipe(new EncryptStream(this.fileEncryptionKey, this.iv)).pipe(hashStream)
          .on('data', () => {})
          .on('error', reject)
          .on('end', resolve);
      }).then(() => {
        return generateMerkleTree(shard);
      })
      .then((merkleTree) => {
        // 3. Generar meta
        shardMeta = {
          hash: hashStream.getHash().toString('hex'),
          size: shard.size,
          index: shard.index,
          parity: false,
          challenges_as_str: merkleTree.challenges_as_str,
          tree: merkleTree.leaf
        };

        console.log('Uploading shard %s', shardMeta.hash);
        shardMetas.push(shardMeta);

        return negotiateContract(shardMeta);
      }).then((contract) => {
        const uploadShardParams = {
          index: shardMeta.index,
          replaceCount: 0,
          hash: shardMeta.hash,
          size: shardMeta.size,
          parity: false,
          token: contract.token,
          farmer: { ...contract.farmer, lastSeen: new Date() },
          operation: contract.operation
        };

        console.log('uploadShardParams', uploadShardParams);

        const req = https.request({
          protocol: 'https:',
          method: 'POST',
          hostname: 'proxy01.api.internxt.com',
          path: `/http://${uploadShardParams.farmer.address}:${uploadShardParams.farmer.port}/shards/${uploadShardParams.hash}?token=${uploadShardParams.token}`,
          headers: {
            'Content-Type': 'application/octet-stream'
          }
        }, (res) => {
          console.log(`statusCode: ${res.statusCode}`);

          res.on('data', d => {
            process.stdout.write(d);
          });
        });

        shard.getStream().pipe(new EncryptStream(this.fileEncryptionKey, this.iv)).pipe(req)
          .on('data', () => {})
          .on('error', (err) => {
            next(err);
          })
          .on('finish', () => {
            this.emit(UploadEvents.ShardUploadSuccess, {
              hash: shardMeta.hash,
              size: shardMeta.size
            });
            next();
          });
      }).catch((err) => {
        next(err);
      });
    }).then(() => {
      this.emit(UploadEvents.Finished, { result: shardMetas });
    }).catch((err) => {
      this.emit(UploadEvents.Error, wrap('Shard upload error', err));
    });
  }

  abort(): void {
    this.emit(UploadEvents.Aborted);
  }
}