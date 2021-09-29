import { DownloadOptions } from '../..';
import { ActionState } from '../../api/ActionState';

export * from './download';

export { DownloadStrategy, DownloadEvents } from './DownloadStrategy';
export { OneStreamStrategy } from './OneStreamStrategy';
export { EmptyStrategy as DownloadEmptyStrategy } from './EmptyStrategy';

export type OneStreamStrategyLabel = 'OneStreamOnly';
export type OneStreamStrategyObject = { label: OneStreamStrategyLabel, params: { }};
export type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: OneStreamStrategyObject) => ActionState;

export type MultipleStreamsStrategyLabel = 'MultipleStreams';
export type MultipleStreamsStrategyObject = { label: MultipleStreamsStrategyLabel, params: { }};
export type MultipleStreamsStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;

export type DownloadStrategyLabel = OneStreamStrategyLabel;
export type DownloadStrategyObject = OneStreamStrategyObject | MultipleStreamsStrategyObject;
export type DownloadFunction = OneStreamStrategyFunction & MultipleStreamsStrategyFunction;
