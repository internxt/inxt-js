import { DownloadOptions } from '../..';
import { ActionState } from '../../api/ActionState';

export * from './download';

export { OneStreamStrategy } from './OneStreamStrategy';
export { EmptyStrategy as DownloadEmptyStrategy } from './EmptyStrategy';

export type OneStreamStrategyObject = { label: 'OneStreamOnly', params: { }};
export type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadOptions, strategyObj: OneStreamStrategyObject) => ActionState;

export type DownloadStrategyObject = OneStreamStrategyObject;
export type DownloadFunction = OneStreamStrategyFunction;
