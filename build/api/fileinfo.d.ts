import { EnvironmentConfig } from '../index';
export interface FileInfo {
    index: string;
    hmac: {
        value: string;
    };
    filename: string;
}
export declare function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<FileInfo>;
export declare function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<any>;
