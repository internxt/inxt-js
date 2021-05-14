import { EnvironmentConfig } from '../index';
import { Shard } from './shard';
export interface FileInfo {
    bucket: string;
    mimetype: string;
    filename: string;
    frame: string;
    size: number;
    id: string;
    created: Date;
    hmac: {
        value: string;
        type: string;
    };
    erasure: {
        type: string;
    };
    index: string;
}
export declare function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<FileInfo>;
export declare function GetFileMirror(config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes?: string[]): Promise<Shard[]>;
export declare function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<Shard[]>;
