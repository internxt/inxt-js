/// <reference types="node" />
import { EnvironmentConfig } from "..";
import { FileInfo } from "./fileinfo";
import { Transform } from 'stream';
export interface Shard {
    index: number;
    hash: string;
    size: number;
    parity: Boolean;
    token: string;
    farmer: {
        userAgent: string;
        protocol: string;
        address: string;
        port: number;
        nodeID: string;
        lastSeen: Date;
    };
    operation: string;
}
export declare function DownloadShard(config: EnvironmentConfig, fileInfo: FileInfo, shard: Shard, bucketId: string, fileId: string, excludedNodes?: Array<string>): Promise<Transform | never>;
