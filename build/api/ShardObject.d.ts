/// <reference types="node" />
import { Readable } from "stream";
import { EventEmitter } from "events";
import { ContractNegotiated } from "../lib/contracts";
import { ShardMeta } from "../lib/shardMeta";
import { InxtApiI } from "../services/api";
import { Shard } from "./shard";
import AbortController from 'abort-controller';
declare type PutUrl = string;
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
    static requestPut(url: string): Promise<PutUrl>;
    static putStream(url: PutUrl, content: Readable, controller?: AbortController): Promise<any>;
    negotiateContract(): Promise<ContractNegotiated>;
    private sendShardToNode;
    abort(): void;
    download(): Promise<Readable>;
}
export {};
