import { UploadProgressCallback } from "..";
import { ShardMeta } from "../lib/shardMeta";
export interface FileObjectUploadProtocol {
    stage(): void;
    upload(cb: UploadProgressCallback): Promise<ShardMeta[]>;
}
