/// <reference types="node" />
import { Readable } from "stream";
import { EventEmitter } from "events";
import { ShardMeta } from "../lib/shardMeta";
import { InxtApiI } from "../services/api";
export declare class ShardObjectUpload extends EventEmitter {
    private meta;
    private api;
    private frameId;
    private requests;
    static Events: {
        NodeTransferFinished: string;
    };
    constructor(frameId: string, meta: ShardMeta, api: InxtApiI);
    get size(): number;
    get hash(): string;
    get index(): number;
    upload(content: Buffer): Promise<ShardMeta>;
    private negotiateContract;
    private sendShardToNode;
    abort(): void;
    download(): Readable;
}
