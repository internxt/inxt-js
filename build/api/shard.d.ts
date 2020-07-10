/// <reference types="node" />
import { EnvironmentConfig } from "..";
export interface Shard {
    farmer: {
        address: string;
        port: number;
        nodeID: string;
    };
    hash: string;
    token: string;
    index: number;
}
export declare function CheckShard(shard: Shard): Promise<void>;
export declare function DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes?: Array<string>): Promise<Buffer | never>;
