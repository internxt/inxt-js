import { DownloadFileOptions, EnvironmentConfig } from '../..';
import { ActionState } from '../../api/ActionState';
export declare function Download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, state: ActionState): Promise<void>;
