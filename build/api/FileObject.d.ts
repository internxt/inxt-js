/// <reference types="node" />
import * as Winston from 'winston';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { FileInfo } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { Shard } from "./shard";
import { ShardObject } from './ShardObject';
import { DownloadStrategy } from '../lib/download/DownloadStrategy';
export declare class FileObject extends EventEmitter {
    shards: ShardObject[];
    rawShards: Shard[];
    fileInfo: FileInfo | undefined;
    config: EnvironmentConfig;
    length: number;
    final_length: number;
    bucketId: string;
    fileId: string;
    fileKey: Buffer;
    fileToken?: string;
    totalSizeWithECs: number;
    private aborted;
    private debug;
    private api;
    private downloader;
    private abortables;
    constructor(config: EnvironmentConfig, bucketId: string, fileId: string, debug: Winston.Logger, downloader: DownloadStrategy);
    setFileEncryptionKey(key: Buffer): void;
    setFileToken(token: string): void;
    checkIfIsAborted(): void;
    getInfo(): Promise<FileInfo | undefined>;
    getMirrors(): Promise<void>;
    download(): Promise<Readable>;
    abort(): void;
    isAborted(): boolean;
}
