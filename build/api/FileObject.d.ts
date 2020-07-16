/// <reference types="node" />
import { ShardObject } from "./ShardObject";
import { FileInfo } from "./fileinfo";
import { EnvironmentConfig } from "..";
import { EventEmitter } from 'events';
import { Shard } from "./shard";
import DecryptStream from "../lib/decryptstream";
export declare class FileObject extends EventEmitter {
    shards: Map<number, ShardObject>;
    rawShards: Map<number, Shard>;
    fileInfo: FileInfo | undefined;
    config: EnvironmentConfig;
    bucketId: string;
    fileId: string;
    fileKey: Buffer;
    totalSizeWithECs: number;
    decipher: DecryptStream | null;
    constructor(config: EnvironmentConfig, bucketId: string, fileId: string);
    GetFileInfo(): Promise<FileInfo | undefined>;
    GetFileMirrors(): Promise<void>;
    StartDownloadFile(): Promise<void>;
    private updateGlobalPercentage;
    private DecryptFile;
}
