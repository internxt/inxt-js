/// <reference types="node" />
import { Shard } from "./shard";
import { EnvironmentConfig } from "..";
import { HashStream } from "../lib/hashstream";
import { ExchangeReport } from "./reports";
import { Transform } from 'stream';
import { EventEmitter } from 'events';
export declare class ShardObject extends EventEmitter {
    shardData: Buffer;
    shardInfo: Shard;
    shardHash: Buffer | null;
    currentPosition: number;
    config: EnvironmentConfig;
    fileId: string;
    bucketId: string;
    retryCount: number;
    hasher: HashStream;
    exchangeReport: ExchangeReport;
    downloadStream: Transform;
    private _isFinished;
    constructor(config: EnvironmentConfig, shardInfo: Shard, bucketId: string, fileId: string);
    StartDownloadShard(): void;
    isFinished(): boolean;
}
