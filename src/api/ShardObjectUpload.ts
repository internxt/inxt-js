import { AxiosError } from "axios";
import { Readable } from "stream";
import { EventEmitter } from "events";

import { INXTRequest } from "../lib";
import { ContractNegotiated } from "../lib/contracts";
import { ShardMeta } from "../lib/shardMeta";
import { wrap } from "../lib/utils/error";
import { logger } from "../lib/utils/logger";
import { InxtApiI, SendShardToNodeResponse } from "../services/api";
import { Shard } from "./shard";

export class ShardObjectUpload extends EventEmitter {
  private meta: ShardMeta;
  private api: InxtApiI;
  private frameId: string;
  private requests: INXTRequest[] = [];

  static Events = {
    NodeTransferFinished: 'node-transfer-finished'
  };

  constructor(frameId: string, meta: ShardMeta, api: InxtApiI) {
    super();

    this.frameId = frameId;
    this.meta = meta;
    this.api = api;
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
    const contract = await this.negotiateContract();

    logger.debug('Negotiated succesfully contract for shard %s (index %s, size %s) with token %s',
      this.hash,
      this.index,
      this.size,
      contract.token
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
      operation: contract.operation
    };

    await this.sendShardToNode(content, shard);

    return this.meta;
  }

  private negotiateContract(): Promise<ContractNegotiated> {
    const req = this.api.addShardToFrame(this.frameId, this.meta);
    this.requests.push(req);

    return req.start<ContractNegotiated>()
      .catch((err) => {
        throw wrap('Contract negotiation error', err);
      });
  }

  private sendShardToNode(content: Buffer, shard: Shard): Promise<SendShardToNodeResponse> {
    const req = this.api.sendShardToNode(shard, content);
    this.requests.push(req);

    let success = true;

    return req.start<SendShardToNodeResponse>()
      .catch((err: AxiosError) => {
        if (err.response && err.response.status < 400) {
          return { result: err.response.data && err.response.data.error };
        }

        success = false;

        throw wrap('Farmer request error', err);
      }).finally(() => {
        const hash = shard.hash;
        const nodeID = shard.farmer.nodeID;

        this.emit(ShardObjectUpload.Events.NodeTransferFinished, { hash, nodeID, success });
      });
  }

  abort(): void {
    this.requests.forEach((r) => {
      r.abort();
    });
  }

  download(): Readable {
    // TODO
    return Readable.from('');
  }
}
