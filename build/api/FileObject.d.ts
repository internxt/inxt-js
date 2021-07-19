/// <reference types="node" />
import * as Winston from 'winston';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import DecryptStream from "../lib/decryptstream";
import { ShardObject } from "./ShardObject";
import { FileInfo } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { Shard } from "./shard";
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
    totalSizeWithECs: number;
    decipher: DecryptStream;
    private aborted;
    private debug;
    constructor(config: EnvironmentConfig, bucketId: string, fileId: string, debug: Winston.Logger);
    checkIfIsAborted(): void;
    getInfo(): Promise<FileInfo | undefined>;
    getMirrors(): Promise<void>;
    TryDownloadShardWithFileMuxer(shard: Shard, excluded?: string[]): Promise<Buffer>;
    download(): Readable;
    abort(): void;
    isAborted(): boolean;
}
