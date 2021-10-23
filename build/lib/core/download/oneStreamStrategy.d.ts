import { EnvironmentConfig, Shard } from "../../../api";
import { DownloadStrategy } from "./strategy";
export declare class OneStreamStrategy extends DownloadStrategy {
    private abortables;
    private internalBuffer;
    private downloadsProgress;
    private decipher;
    private config;
    private concurrency;
    private progressIntervalId;
    private aborted;
    constructor(config: EnvironmentConfig);
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
