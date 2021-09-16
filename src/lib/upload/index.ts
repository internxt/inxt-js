import { UploadFileOptions } from '../..';
import { ActionState } from '../../api/ActionState';
import { Params as OneStreamOnlyStrategyParams } from './OneStreamStrategy';
import { Params as MultipleStreamsStrategyParams } from './StreamsFileSystemStrategy';
export interface UploadOptions extends UploadFileOptions {
  filename: string;
}

export * from './upload';
export { OneStreamStrategy } from './OneStreamStrategy';
export { StreamFileSystemStrategy } from './StreamsFileSystemStrategy';

export type BlobStrategyObject = { label: 'Blob', params: {}};
export type OneStreamStrategyObject = { label: 'OneStreamOnly', params: OneStreamOnlyStrategyParams };
export type MultipleStreamsStrategyObject = { label: 'MultipleStreams', params: MultipleStreamsStrategyParams };
export type UploadStrategyObject = BlobStrategyObject | OneStreamStrategyObject | MultipleStreamsStrategyObject;

export type BlobStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: BlobStrategyObject) => ActionState;
export type OneStreamOnlyStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: OneStreamStrategyObject) => ActionState;
export type MultipleStreamsStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;

export type UploadFunction = BlobStrategyFunction & OneStreamOnlyStrategyFunction & MultipleStreamsStrategyFunction;
