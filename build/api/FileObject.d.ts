/// <reference types="node" />
import { ShardObject } from "./ShardObject";
import { FileInfo } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { EventEmitter } from 'events';
import { Shard } from "./shard";
import DecryptStream from "../lib/decryptstream";
import FileMuxer from "../lib/filemuxer";
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
    StartDownloadFile(): FileMuxer;
}
