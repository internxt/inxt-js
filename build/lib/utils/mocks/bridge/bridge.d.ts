import { EnvironmentConfig } from '../../../..';
import { Shard } from '../../../../api/shard';
export interface ShardReferenced extends Shard {
    fileId: string;
    bucketId: string;
}
export declare const BRIDGE_ERRORS: {
    DEFAULT: string;
};
export declare class BridgeMock {
    mirrors: ShardReferenced[];
    DEFAULT_BRIDGE_ERROR_MESSAGE: string;
    constructor(mirrors: ShardReferenced[]);
    GetFileMirror(config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes?: Array<string>): Promise<ShardReferenced[]>;
    private _limit;
    private _skip;
    resolve(): Promise<boolean>;
    reject(): Promise<void>;
}
export declare const generateShardReferenced: (index: number, hash: string, nodeID: string, fileId: string, bucketId: string) => ShardReferenced;
