/// <reference types="node" />
import { Transform, Readable } from 'stream';
import { EnvironmentConfig } from "..";
export interface Shard {
    index: number;
    replaceCount: number;
    hash: string;
    size: number;
    parity: boolean;
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
export declare function DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string, nodeID: string): Promise<Readable>;
export declare function DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes?: Array<string>): Promise<Transform | never>;
