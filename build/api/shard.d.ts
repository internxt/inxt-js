/// <reference types="node" />
import { EnvironmentConfig } from "..";
import { FileInfo } from "./fileinfo";
import { Transform } from 'stream';
export interface Shard {
    farmer: {
        address: string;
        port: number;
        nodeID: string;
    };
    hash: string;
    token: string;
    index: number;
    size: number;
}
export declare function DownloadShard(config: EnvironmentConfig, fileInfo: FileInfo, shard: Shard, bucketId: string, fileId: string, excludedNodes?: Array<string>): Promise<Transform | never>;
