/// <reference types="node" />
import { Shard } from "../api/shard";
import { Transform } from 'stream';
import { FileInfo } from "../api/fileinfo";
export declare class ShardDownloaderStream extends Transform {
    fileInfo: FileInfo;
    shardInfo: Shard;
    constructor(fileInfo: FileInfo, shardInfo: Shard);
    startDownload(): void;
}
