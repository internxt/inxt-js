/// <reference types="node" />
import * as Winston from 'winston';
import { Readable } from 'stream';
import { DownloadProgressCallback, EnvironmentConfig } from '../..';
import { ActionState } from '../../api/ActionState';
export declare function download(config: EnvironmentConfig, bucketId: string, fileId: string, progress: DownloadProgressCallback, debug: Winston.Logger, state: ActionState): Promise<Readable>;
