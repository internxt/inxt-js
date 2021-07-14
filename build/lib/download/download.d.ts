/// <reference types="node" />
import { Readable } from 'stream';
import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { ActionState } from '../../api/ActionState';
export declare function download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, state: ActionState): Promise<Readable>;
