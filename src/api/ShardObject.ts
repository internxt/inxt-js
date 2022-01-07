import { Readable } from 'stream';
import { EventEmitter } from 'events';

import { INXTRequest } from '../lib';
import { ContractMeta } from '../api';
import { ShardMeta } from '../lib/models';
import { wrap } from '../lib/utils/error';
import { logger } from '../lib/utils/logger';
import { InxtApiI, SendShardToNodeResponse } from '../services/api';
import { Shard } from './';
import { get } from '../services/request';

import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

import { getProxy } from '../services/proxy';

type PutUrl = string;
type GetUrl = string;

export class ShardObject extends EventEmitter {
  private meta: ShardMeta;
  private api: InxtApiI;
  private frameId: string;
  private requests: INXTRequest[] = [];
  private shard?: Shard;

  static Events = {
    NodeTransferFinished: 'node-transfer-finished',
  };

  constructor(api: InxtApiI, frameId: string | null, meta: ShardMeta | null, shard?: Shard) {
    super();

    // TODO: Clarify if meta and shard variables are both required.
    this.frameId = frameId ?? '';
    this.meta = meta ?? {
      hash: '',
      index: 0,
      parity: false,
      challenges_as_str: [],
      size: 0,
      tree: [],
      challenges: [],
    };
    this.api = api;
    this.shard = shard;
  }

  get size(): number {
    return this.meta.size;
  }

  get hash(): string {
    return this.meta.hash;
  }

  get index(): number {
    return this.meta.index;
  }

  async upload(content: Buffer): Promise<ShardMeta> {
    if (!this.frameId) {
      throw new Error('Frame id not provided');
    }

    const contract = await this.negotiateContract();

    logger.debug(
      'Negotiated succesfully contract for shard %s (index %s, size %s) with token %s',
      this.hash,
      this.index,
      this.size,
      contract.token,
    );

    const farmer = { ...contract.farmer, lastSeen: new Date() };
    const shard: Shard = {
      index: this.index,
      replaceCount: 0,
      hash: this.hash,
      size: this.size,
      parity: this.meta.parity,
      token: contract.token,
      farmer,
      operation: contract.operation,
    };

    await this.sendShardToNode(content, shard);

    return this.meta;
  }

  static requestPutTwo(url: string, cb: (err: Error | null, url: PutUrl) => void, useProxy: boolean) {
    get<{ result: string }>(url, { useProxy })
      .then((res) => {
        cb(null, res.result);
      })
      .catch((err) => {
        cb(err, '');
      });
  }

  static requestPut(url: string): Promise<PutUrl> {
    return get<{ result: string }>(url, { useProxy: true }).then((res) => res.result);
  }

  static requestGet(url: string, useProxy = true): Promise<GetUrl> {
    return get<{ result: string }>(url, { useProxy }).then((res) => res.result);
  }

  static async putStreamTwo(
    url: PutUrl,
    content: Readable,
    cb: (err: Error | null) => void,
    useProxy: boolean,
  ): Promise<void> {
    let free: undefined | (() => void);
    let targetUrl = url;

    if (useProxy) {
      const proxy = await getProxy();
      free = proxy.free;
      targetUrl = `${proxy.url}/${targetUrl}`;
    }
    const formattedUrl = new URL(targetUrl);
    const request = formattedUrl.protocol === 'http:' ? httpRequest : httpsRequest;
    const putRequest = request(
      {
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        hostname: formattedUrl.hostname,
        port: formattedUrl.port,
        protocol: formattedUrl.protocol,
        path: formattedUrl.pathname + '?' + formattedUrl.searchParams.toString(),
        method: 'PUT',
      },
      (res) => {
        if (res.statusCode !== 200) {
          return cb(new Error('Request failed with status ' + res.statusCode));
        }

        const chunks: Buffer[] = [];

        res.on('data', chunks.push.bind(chunks));
        res.once('error', cb);
        res.once('end', () => {
          // const body = Buffer.concat(chunks);
          // console.log(body.toString());
          free?.();
          cb(null);
        });
      },
    );

    content.once('error', (err) => {
      putRequest.emit('error', err);
    });

    content.pipe(putRequest);
  }

  negotiateContract(): Promise<ContractMeta> {
    const req = this.api.addShardToFrame(this.frameId, this.meta);
    this.requests.push(req);

    return req.start<ContractMeta>().catch((err) => {
      throw wrap('Contract negotiation error', err);
    });
  }

  private sendShardToNode(content: Buffer, shard: Shard): Promise<SendShardToNodeResponse> {
    const req = this.api.sendShardToNode(shard, content);
    this.requests.push(req);

    let success = true;

    return req
      .start<SendShardToNodeResponse>()
      .catch((err: any) => {
        if (err.response && err.response.status < 400) {
          return { result: err.response.data && err.response.data.error };
        }

        success = false;

        throw wrap('Farmer request error', err);
      })
      .finally(() => {
        const hash = shard.hash;
        const nodeID = shard.farmer.nodeID;

        this.emit(ShardObject.Events.NodeTransferFinished, { hash, nodeID, success });
      });
  }

  abort(): void {
    this.requests.forEach((r) => {
      r.abort();
    });
  }
}
