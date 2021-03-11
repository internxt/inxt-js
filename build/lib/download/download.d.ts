/// <reference types="node" />
import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { Readable } from 'stream';
export declare function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Readable>;
