import { DownloadStrategy } from "./DownloadStrategy";
export declare class EmptyStrategy extends DownloadStrategy {
    download(): Promise<void>;
    abort(): void;
}
