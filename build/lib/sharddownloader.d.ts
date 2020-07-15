/// <reference types="node" />
import { Transform } from 'stream';
import { FileInfo } from "../api/fileinfo";
export declare class ShardDownloader extends Transform {
    fileInfo: FileInfo;
    constructor(fileInfo: FileInfo);
    startDownload(): void;
}
