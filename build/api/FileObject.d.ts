/// <reference types="node" />
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import DecryptStream from "../lib/decryptstream";
import FileMuxer from "../lib/filemuxer";
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
    private downloads;
    constructor(config: EnvironmentConfig, bucketId: string, fileId: string);
    checkIfIsAborted(): void;
    getInfo(): Promise<FileInfo | undefined>;
    getMirrors(): Promise<void>;
    StartDownloadShard(index: number): FileMuxer;
    TryDownloadShardWithFileMuxer(shard: Shard, excluded?: string[]): Promise<Buffer>;
    download(): Readable;
    abort(): void;
    isAborted(): boolean;
}
