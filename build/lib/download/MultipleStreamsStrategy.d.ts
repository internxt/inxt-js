import { Shard } from "../../api/shard";
import { DownloadStrategy } from "./DownloadStrategy";
export declare class MultipleStreamsStrategy extends DownloadStrategy {
    private abortables;
    private progressCoefficients;
    constructor();
    download(mirrors: Shard[]): Promise<void>;
    abort(): void;
}
