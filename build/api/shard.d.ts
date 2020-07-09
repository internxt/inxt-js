/// <reference types="node" />
export interface Shard {
    farmer: {
        address: string;
        port: number;
    };
    hash: string;
    token: string;
    index: string;
}
export declare function CheckShard(shard: Shard): Promise<void>;
export declare function DownloadShard(shard: Shard): Promise<Buffer>;
