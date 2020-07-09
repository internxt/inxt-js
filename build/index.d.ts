export declare class Environment {
    private config;
    constructor(config: EnvironmentConfig);
    setEncryptionKey(newEncryptionKey: string): void;
    download(bucketId: string, fileId: string): Promise<{
        name: string;
        data: unknown;
    }>;
}
export interface EnvironmentConfig {
    bridgeUrl?: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey?: string;
    logLevel?: number;
}
