import { EnvironmentConfig } from '../index';
import { Shard } from './shard';
export interface FileInfo {
    index: string;
    hmac: {
        value: string;
    };
    filename: string;
}
export declare function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<any>;
export declare function GetFileMirror(config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes?: Array<string>): Promise<Array<Shard>>;
export declare function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<any>;
