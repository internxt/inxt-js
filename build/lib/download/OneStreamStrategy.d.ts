import { Shard } from "../../api/shard";
import { DownloadStrategy } from "./DownloadStrategy";
export declare class OneStreamStrategy extends DownloadStrategy {
    private abortables;
    download(mirrors: Shard[]): Promise<void>;
    abort(): void;
}
