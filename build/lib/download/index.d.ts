import { DownloadOptions } from '../..';
import { ActionState } from '../../api/ActionState';
export * from './download';
export { OneStreamStrategy } from './OneStreamStrategy';
export { MultipleStreamsStrategy } from './MultipleStreamsStrategy';
export { EmptyStrategy as DownloadEmptyStrategy } from './EmptyStrategy';
export declare type OneStreamStrategyLabel = 'OneStreamOnly';
export declare type OneStreamStrategyObject = {
    label: OneStreamStrategyLabel;
    params: {};
};
export declare type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: OneStreamStrategyObject) => ActionState;
export declare type MultipleStreamsStrategyLabel = 'MultipleStreams';
export declare type MultipleStreamsStrategyObject = {
    label: MultipleStreamsStrategyLabel;
    params: {};
};
export declare type MultipleStreamsStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;
export declare type DownloadStrategyLabel = OneStreamStrategyLabel & MultipleStreamsStrategyLabel;
export declare type DownloadStrategyObject = OneStreamStrategyObject | MultipleStreamsStrategyObject;
export declare type DownloadFunction = OneStreamStrategyFunction & MultipleStreamsStrategyFunction;
