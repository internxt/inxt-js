import { eachLimit, queue } from "async";
import { createDecipheriv, Decipher, randomBytes } from "crypto";
import { Readable } from "stream";
import { EnvironmentConfig } from "../..";

import { Abortable } from "../../api/Abortable";
import { Events } from "../../api/events";
import { ExchangeReport } from "../../api/reports";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
import { HashStream } from "../hasher";
import { wrap } from "../utils/error";
import { DownloadStrategy } from "./DownloadStrategy";

export class OneStreamStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];
  private decipher: Decipher;
  private internalBuffer: Buffer[] = [];
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    super();

    this.config = config;
    this.decipher = createDecipheriv('aes-256-ctr', randomBytes(32), randomBytes(16));
  }

  async download(mirrors: Shard[]): Promise<void> {
    console.time('download');
    try {
      this.emit(Events.Download.Start);

      this.decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      this.emit(Events.Download.Ready, this.decipher);

      mirrors.sort((mA, mb) => mA.index - mb.index);

      let concurrency = 1;

      let lastShardIndexDecrypted = -1;

      const downloadTask = (mirror: Shard, cb: (err: Error | null | undefined) => void) => {
        getDownloadStream(mirror, (err, shardStream) => {
          console.log('Got stream for mirror %s', mirror.index);

          if (err) {
            return cb(err);
          }

          this.handleShard(mirror, shardStream as Readable, (downloadErr) => {
            console.log('Stream handled for mirror %s', mirror.index);
            if (downloadErr) {
              return cb(downloadErr);
            }

            const waitingInterval = setInterval(() => {
              if (lastShardIndexDecrypted !== mirror.index - 1) {
                return;
              }

              clearInterval(waitingInterval);

              this.decryptShard(mirror.index, (decryptErr) => {
                console.log('Decrypting shard for mirror %s', mirror.index);
                if (decryptErr) {
                  return cb(decryptErr);
                }
                lastShardIndexDecrypted++;
                cb(null);
              });
            }, 50);
          });
        });
      };

      const downloadQueue = queue(downloadTask, concurrency);

      await eachLimit(mirrors, concurrency, (mirror, cb) => {
        downloadQueue.push(mirror, (err) => {
          if (err) {
            return cb(err);
          }
          this.internalBuffer[mirror.index] = Buffer.alloc(0);
          cb();
        });
      });

      console.timeEnd('download');
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  private decryptShard(index: number, cb: (err: Error | null | undefined) => void) {
    if (this.decipher.write(this.internalBuffer[index])) {
      return cb(null);
    }

    this.decipher.once('drain', cb);
  }

  private handleShard(shard: Shard, stream: Readable, cb: (err: Error | null | undefined) => void) {
    let errored = false;

    const shardBuffers: Buffer[] = [];
    const exchangeReport = ExchangeReport.build(this.config, shard);
    const hasher = new HashStream();
    const downloadPipeline = stream.pipe(hasher);

    downloadPipeline.on('data', shardBuffers.push.bind(shardBuffers));
    downloadPipeline.once('error', (err) => {
      errored = true;
      exchangeReport.error();
      cb(err);
    }).once('end', () => {
      if (errored) {
        return;
      }

      const hash = hasher.getHash().toString('hex');

      if (hash !== shard.hash) {
        exchangeReport.error();
        return cb(new Error(`Hash for downloaded shard ${shard.hash} does not match`));
      }
      exchangeReport.success();

      this.internalBuffer[shard.index] = Buffer.concat(shardBuffers);
      cb(null);
    });
  }

  private handleError(err: Error) {
    this.abortables.forEach((abortable) => abortable.abort());

    this.decipher.emit('error', wrap('OneStreamStrategy', err));
  }

  abort(): void {
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(Events.Download.Abort);
  }
}

function getDownloadStream(shard: Shard, cb: (err: Error | null | undefined, stream: Readable | null) => void): void {
  ShardObject.requestGet(buildRequestUrlShard(shard), false).then(getStream).then((stream) => {
    cb(null, stream);
  }).catch((err) => {
    cb(err, null);
  })
}

function buildRequestUrlShard(shard: Shard) {
  const { address, port } = shard.farmer;

  return `http://${address}:${port}/download/link/${shard.hash}`;
}
