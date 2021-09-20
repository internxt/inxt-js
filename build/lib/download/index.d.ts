import { DownloadOptions } from '../..';
import { ActionState } from '../../api/ActionState';
export * from './download';
export { OneStreamStrategy } from './OneStreamStrategy';
export { EmptyStrategy as DownloadEmptyStrategy } from './EmptyStrategy';
export declare type OneStreamStrategyObject = {
    label: 'OneStreamOnly';
    params: {};
};
export declare type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: OneStreamStrategyObject) => ActionState;
export declare type DownloadStrategyObject = OneStreamStrategyObject;
export declare type DownloadFunction = OneStreamStrategyFunction;
