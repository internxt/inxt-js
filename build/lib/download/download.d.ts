/// <reference types="node" />
import { Readable } from 'stream';
import { DownloadFileOptions, EnvironmentConfig } from '../..';
export declare function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions): Promise<Readable>;
