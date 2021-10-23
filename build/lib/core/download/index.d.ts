/// <reference types="node" />
import { Readable } from 'stream';
import { ActionState, EnvironmentConfig } from '../../../api';
import { DownloadStrategy } from './strategy';
export * from './strategy';
export * from './oneStreamStrategy';
export declare type DownloadFinishedCallback = (err: Error | null, fileStream: Readable | null) => void;
export declare type DownloadProgressCallback = (progress: number, downloadedBytes: number | null, totalBytes: number | null) => void;
export declare type OneStreamStrategyLabel = 'OneStreamOnly';
export declare type OneStreamStrategyObject = {
    label: OneStreamStrategyLabel;
    params: any;
};
export declare type OneStreamStrategyFunction = (bucketId: string, fileId: string, opts: DownloadFileOptions, strategyObj: OneStreamStrategyObject) => ActionState;
export declare type MultipleStreamsStrategyLabel = 'MultipleStreams';
export declare type MultipleStreamsStrategyObject = {
    label: MultipleStreamsStrategyLabel;
    params: any;
};
export declare type MultipleStreamsStrategyFunction = (bucketId: string, fileId: string, opts: DownloadFileOptions, strategyObj: MultipleStreamsStrategyObject) => ActionState;
export declare type DownloadStrategyLabel = OneStreamStrategyLabel;
export declare type DownloadStrategyObject = OneStreamStrategyObject | MultipleStreamsStrategyObject;
export declare type DownloadFunction = OneStreamStrategyFunction & MultipleStreamsStrategyFunction;
export interface DownloadFileOptions {
    fileToken?: string;
    fileEncryptionKey?: Buffer;
    progressCallback: DownloadProgressCallback;
    finishedCallback: DownloadFinishedCallback;
}
export declare function download(config: EnvironmentConfig, bucketId: string, fileId: string, options: DownloadFileOptions, state: ActionState, strategy: DownloadStrategy): Promise<Readable>;
