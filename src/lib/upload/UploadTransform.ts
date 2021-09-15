import { ClientRequest, IncomingMessage } from 'http';
import { request } from 'https';
import { PassThrough, Readable, Transform, TransformOptions } from 'stream';
import { URL } from 'url';

import { ContractNegotiated } from '../contracts';
import { ShardMeta } from '../shardMeta';

type ContinueCallback = (err: Error | null) => void;

interface ShardUploadTask {
  meta: ShardMeta;
  contract: ContractNegotiated;
  finished: boolean;
}

interface UploadRequest {
  index: number;
  request: ClientRequest;
}

interface Pusheable {
  pusher: Pusher;
}

class Pusher {
  private packets: Buffer[] = [];
  private req: UploadRequest;
  private interval: NodeJS.Timeout = setTimeout(() => {}, 0);
  private id = Math.trunc(Math.random() * 2000);

  private passthrough = new PassThrough();
  private stillSendingPackets = false;

  constructor(req: UploadRequest) {
    this.req = req;

    this.passthrough.pipe(this.req.request);
  }

  init() {
    this.startPushing();
  }

  startPushing() {
    this.interval = setInterval(async () => {
      if (this.packets.length > 0) {
        this.stillSendingPackets = true;
        this.pausePushing();

        // console.log('pusher %s: detected %s packets to be sent', this.id, this.packets.length);

        while (this.packets.length > 0) {
          const packet = this.packets.shift() as Buffer;

          // console.log('pusher %s, sending packet, packets left: %s', this.id, this.packets.length);

          const r = Readable.from(packet);
          r.pipe(this.passthrough, { end: false });

          await new Promise((resolve, reject) => {
            r.on('end', resolve);
            r.on('error', reject);
          });
        }

        // console.log('stillSending packets finished');
        this.stillSendingPackets = false;
        this.startPushing();
      }
    }, 10);
  }

  pausePushing() {
    clearInterval(this.interval);
  }

  end() {
    const endWatcher = setInterval(() => {
      if (this.stillSendingPackets) {
        return;
      }

      this.req.request.once('end', () => {
        console.log('request end!!');
      });

      this.req.request.end();

      Readable.from(Buffer.alloc(0)).pipe(this.passthrough).on('end', () => {
        console.log('request ended here');
      });

      clearInterval(endWatcher);
    }, 100);
  }

  attach(b: Buffer) {
    this.packets.push(b);
  }
}

// tslint:disable-next-line: max-classes-per-file
export class UploadTransform extends Transform {
  private shardUploadTasks: ShardUploadTask[];
  private requests: (Pusheable & UploadRequest)[] = [];

  private currentShardIndex = 0;
  private currentShardBytes = 0;

  constructor(shardUploadTasks: ShardUploadTask[], totalTasks: number, options?: TransformOptions) {
    super(options);

    this.shardUploadTasks = shardUploadTasks;

    const endInterval = setInterval(() => {
      if (shardUploadTasks.filter(t => t.finished).length === totalTasks) {
        console.log('tasks ended');
        this.emit('tasks-end');
        clearInterval(endInterval);
      }
    }, 100);
  }

  _transform(chunk: Buffer, enc: string, done: ContinueCallback): void {
    // console.log('chunk', chunk.length);

    const task = this.shardUploadTasks.find(t => t.meta.index === this.currentShardIndex);

    if (!task) {
      done(new Error('Contract not found for shard index ' + this.currentShardIndex));
    }

    // console.log('currentShardBytes %s', this.currentShardBytes);

    const bytesToRefill = task!.meta.size - this.currentShardBytes;

    let contentToSendNow = chunk;

    if (bytesToRefill <= chunk.length) {
      // console.log('bytesToRefill %s', bytesToRefill);
      this.pushContent(chunk.slice(0, bytesToRefill), this.currentShardIndex);
      this.requests[this.currentShardIndex].pusher.end();
      this.currentShardIndex++;
      this.currentShardBytes = 0;

      contentToSendNow = chunk.slice(bytesToRefill);
    }

    if (bytesToRefill !== chunk.length) {
      this.pushContent(contentToSendNow, this.currentShardIndex);
    }

    done(null);
  }

  _flush(cb: (err: Error | null) => void) {
    cb(null);
  }

  private pushContent(chunk: Buffer, shardIndex: number) {
    const task = this.shardUploadTasks.find(t => t.meta.index === shardIndex);
    const maybeRequest = this.requests.find(r => r.index === shardIndex);

    if (!maybeRequest) {
      // console.log('creating request');
      const req = this.createRequest(this.currentShardIndex, new URL(buildUrlFromContract(task!.contract)));

      this.requests.push(req);

      req.pusher.attach(chunk);
      req.pusher.init();

      req.request.once('finish', () => {
        // console.log('request enddddd');
        this.emit('task-processed');
        req.request.removeAllListeners();
        task!.finished = true;
      });
    } else {
      maybeRequest.pusher.attach(chunk);
    }

    this.currentShardBytes += chunk.length;
  }

  private createRequest(index: number, url: URL): UploadRequest & Pusheable {
    console.log(url.hostname);
    console.log(url.pathname);

    const req = request({
      protocol: 'https:',
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    }, (res: IncomingMessage) => {
      let dataResponse = Buffer.alloc(0);

      res.on('error', (err) => {
        console.log('err', err);
      });
      res.on('data', d => {
        dataResponse = Buffer.concat([dataResponse, d]);
      });
      res.on('end', () => {
        console.log('https request end');
      });
    });

    const uploadRequest: UploadRequest = { index, request: req };
    const pusher = new Pusher(uploadRequest);

    return { index, request: req, pusher };
  }
}

function buildUrlFromContract(contract: ContractNegotiated): string {
  return `https://proxy02.api.internxt.com/http://${contract.farmer.address}:${contract.farmer.port}/shards/${contract.hash}?token=${contract.token}`;
}
