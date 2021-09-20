import { DownloadOptions } from '../..';
import { ActionState } from '../../api/ActionState';

export * from './download';

export { OneStreamStrategy } from './OneStreamStrategy';
export { MultipleStreamsStrategy } from './MultipleStreamsStrategy';
export { EmptyStrategy as DownloadEmptyStrategy } from './EmptyStrategy';

export type OneStreamStrategyLabel = 'OneStreamOnly';
export type OneStreamStrategyObject = { label: OneStreamStrategyLabel, params: { }};
export type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: OneStreamStrategyObject) => ActionState;

export type MultipleStreamsStrategyLabel = 'MultipleStreams';
export type MultipleStreamsStrategyObject = { label: MultipleStreamsStrategyLabel, params: { }};
export type MultipleStreamsStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;

export type DownloadStrategyLabel = OneStreamStrategyLabel & MultipleStreamsStrategyLabel;
export type DownloadStrategyObject = OneStreamStrategyObject | MultipleStreamsStrategyObject;
export type DownloadFunction = OneStreamStrategyFunction & MultipleStreamsStrategyFunction;
