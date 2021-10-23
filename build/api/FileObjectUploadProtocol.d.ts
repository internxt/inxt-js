import { UploadProgressCallback } from "../lib/core";
import { ShardMeta } from "../lib/models";
export interface FileObjectUploadProtocol {
    stage(): void;
    upload(cb: UploadProgressCallback): Promise<ShardMeta[]>;
}
