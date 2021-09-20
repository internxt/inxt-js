/// <reference types="node" />
import * as Winston from 'winston';
import { Readable } from 'stream';
import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { ActionState } from '../../api/ActionState';
import { DownloadStrategy } from './DownloadStrategy';
export declare function download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, debug: Winston.Logger, state: ActionState): Promise<Readable>;
export declare function downloadV2(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, debug: Winston.Logger, state: ActionState, strategy: DownloadStrategy): Promise<Readable>;
