/// <reference types="node" />
import { Readable } from "stream";
import { EventEmitter } from "events";
import { ShardMeta } from "../lib/shardMeta";
import { InxtApiI } from "../services/api";
import { Shard } from "./shard";
export declare class ShardObject extends EventEmitter {
    private meta;
    private api;
    private frameId;
    private requests;
    private shard?;
    static Events: {
        NodeTransferFinished: string;
    };
    constructor(api: InxtApiI, frameId: string | null, meta: ShardMeta | null, shard?: Shard);
    get size(): number;
    get hash(): string;
    get index(): number;
    upload(content: Buffer): Promise<ShardMeta>;
    private negotiateContract;
    private sendShardToNode;
    abort(): void;
    download(): Promise<Readable>;
}
