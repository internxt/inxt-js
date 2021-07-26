/// <reference types="node" />
import { RequestOptions } from 'https';
import { EventEmitter, Readable, Writable } from 'stream';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
declare enum Methods {
    Get = "GET",
    Post = "POST",
    Put = "PUT"
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
    stream<K>(content: Readable | Writable, size: number, options?: RequestOptions): Promise<AxiosResponse<K>>;
    abort(): void;
    isCancelled(err: Error): boolean;
}
export {};
