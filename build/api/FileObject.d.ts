/// <reference types="node" />
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
    constructor(config: EnvironmentConfig, bucketId: string, fileId: string);
    GetFileInfo(): Promise<FileInfo | undefined>;
    GetFileMirrors(): Promise<void>;
    StartDownloadShard(index: number): Promise<FileMuxer>;
    TryDownloadShardWithFileMuxer(shard: Shard, excluded?: string[]): Promise<Buffer>;
    StartDownloadFile(): FileMuxer;
}
