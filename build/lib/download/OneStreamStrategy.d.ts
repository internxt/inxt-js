import winston from "winston";
import { EnvironmentConfig } from "../..";
import { Shard } from "../../api/shard";
import { DownloadStrategy } from "./DownloadStrategy";
export declare class OneStreamStrategy extends DownloadStrategy {
    private abortables;
    private internalBuffer;
    private downloadsProgress;
    private decipher;
    private config;
    private concurrency;
    private progressIntervalId;
    private aborted;
    private logger;
    constructor(config: EnvironmentConfig, logger: winston.Logger);
    private startProgressInterval;
    private stopProgressInterval;
    private addAbortable;
    download(mirrors: Shard[]): Promise<void>;
    private cleanup;
    private decryptShard;
    private handleShard;
    private handleError;
    abort(): void;
}
