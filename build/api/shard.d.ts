/// <reference types="node" />
import { EnvironmentConfig } from "..";
import { Transform } from 'stream';
export interface Shard {
    index: number;
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
export declare function DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string): Transform;
export declare function DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes?: Array<string>): Promise<Transform | never>;
