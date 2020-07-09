export interface Shard {
    farmer: {
        address: string;
        port: number;
    };
    hash: string;
    token: string;
    index: string;
}
export declare function DownloadShard(shard: Shard): Promise<any>;
