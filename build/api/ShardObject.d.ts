/// <reference types="node" />
import { Shard } from "./shard";
import { EnvironmentConfig } from "..";
import { HashStream } from "../lib/hashstream";
import { ExchangeReport } from "./reports";
import { Transform } from 'stream';
import { EventEmitter } from 'events';
export declare class ShardObject extends EventEmitter {
    shardInfo: Shard;
    shardHash: Buffer | null;
    config: EnvironmentConfig;
    fileId: string;
    bucketId: string;
    retryCount: number;
    hasher: HashStream;
    exchangeReport: ExchangeReport;
    private _isFinished;
    private _isErrored;
    constructor(config: EnvironmentConfig, shardInfo: Shard, bucketId: string, fileId: string);
    StartDownloadShard(): Transform;
    isFinished(): boolean;
}
