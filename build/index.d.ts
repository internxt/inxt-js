export declare class Environment {
    private config;
    constructor(config: EnvironmentConfig);
    setEncryptionKey(newEncryptionKey: string): void;
    download(bucketId: string, fileId: string): void;
}
