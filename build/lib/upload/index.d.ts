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
export declare type BlobStrategyObject = {
    label: 'Blob';
    params: {};
};
export declare type OneStreamStrategyObject = {
    label: 'OneStreamOnly';
    params: OneStreamOnlyStrategyParams;
};
export declare type MultipleStreamsStrategyObject = {
    label: 'MultipleStreams';
    params: MultipleStreamsStrategyParams;
};
export declare type UploadStrategyObject = BlobStrategyObject | OneStreamStrategyObject | MultipleStreamsStrategyObject;
export declare type BlobStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: BlobStrategyObject) => ActionState;
export declare type OneStreamOnlyStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: OneStreamStrategyObject) => ActionState;
export declare type MultipleStreamsStrategyFunction = (bucketId: string, opts: UploadOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;
export declare type UploadFunction = BlobStrategyFunction & OneStreamOnlyStrategyFunction & MultipleStreamsStrategyFunction;
