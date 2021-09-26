/// <reference types="node" />
import { Decipher } from "crypto";
import { EnvironmentConfig } from "../..";
import { Shard } from "../../api/shard";
import { DownloadStrategy } from "./DownloadStrategy";
export declare class MultipleStreamsStrategy extends DownloadStrategy {
    private abortables;
    private decryptBuffer;
    private currentShardIndex;
    private mirrors;
    private downloadsProgress;
    private decipher;
    private config;
    private aborted;
    private progressIntervalId;
    private queues;
    private progressCoefficients;
    constructor(config: EnvironmentConfig);
    private startProgressInterval;
    private stopProgressInterval;
    private addAbortable;
    private buildDownloadTask;
    private buildDownloadQueue;
    download(mirrors: Shard[]): Promise<void>;
    handleError(err: Error): void;
    checkShardsPendingToDecrypt(decipher: Decipher): void;
    abort(): void;
}
