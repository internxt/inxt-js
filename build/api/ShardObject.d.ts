/// <reference types="node" />
import { Readable } from "stream";
import { EventEmitter } from "events";
import { ContractNegotiated } from "../lib/contracts";
import { ShardMeta } from "../lib/shardMeta";
import { InxtApiI } from "../services/api";
import { Shard } from "./";
declare type PutUrl = string;
declare type GetUrl = string;
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
    static requestPutTwo(url: string, cb: (err: Error | null, url: PutUrl) => void): void;
    static requestPut(url: string): Promise<PutUrl>;
    static requestGet(url: string, useProxy?: boolean): Promise<GetUrl>;
    static putStream(url: PutUrl, content: Readable): Promise<any>;
    static putStreamTwo(url: PutUrl, content: Readable, cb: (err: Error | null) => void): void;
    negotiateContract(): Promise<ContractNegotiated>;
    private sendShardToNode;
    abort(): void;
    download(): Promise<Readable>;
}
export {};
