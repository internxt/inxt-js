interface OnlyErrorCallback {
    (err: Error | null): void;
}
interface DownloadProgressCallback {
    (progress: Number, downloadedBytes: Number | null, totalBytes: Number | null): void;
}
export interface ResolveFileOptions {
    progressCallback: DownloadProgressCallback;
    finishedCallback: OnlyErrorCallback;
    overwritte?: boolean;
}
export declare class Environment {
    private config;
    constructor(config: EnvironmentConfig);
    setEncryptionKey(newEncryptionKey: string): void;
    resolveFile(bucketId: string, fileId: string, filePath: string, options: ResolveFileOptions): Promise<any>;
}
export interface EnvironmentConfig {
    bridgeUrl?: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey?: string;
    logLevel?: number;
    webProxy?: string;
}
export {};
