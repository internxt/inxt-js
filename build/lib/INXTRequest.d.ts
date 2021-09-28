/// <reference types="node" />
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
declare enum Methods {
    Get = "GET",
    Post = "POST",
    Put = "PUT",
    Patch = "PATCH"
}
export declare class INXTRequest extends EventEmitter {
    private req;
    private config;
    private cancel;
    private useProxy;
    private streaming;
    method: Methods;
    targetUrl: string;
    params: AxiosRequestConfig;
    static Events: {
        UploadProgress: string;
        DownloadProgress: string;
    };
    constructor(config: EnvironmentConfig, method: Methods, targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean);
    start<K>(): Promise<K>;
    stream<K>(content: Readable, size: number): Promise<AxiosResponse<K>>;
    stream<K>(): Promise<Readable>;
    private getStream;
    private postStream;
    abort(): void;
    isCancelled(err: Error): boolean;
}
export {};
