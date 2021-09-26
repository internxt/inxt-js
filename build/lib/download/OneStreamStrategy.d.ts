import { Shard } from "../../api/shard";
import { DownloadStrategy } from "./DownloadStrategy";
export declare class OneStreamStrategy extends DownloadStrategy {
    private abortables;
    private decipher;
    private internalBuffer;
    constructor();
    download(mirrors: Shard[]): Promise<void>;
    private decryptShard;
    private handleShard;
    private handleError;
    abort(): void;
}
