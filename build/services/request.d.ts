/// <reference types="node" />
import { Readable } from 'stream';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
import AbortController from 'abort-controller';
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean): Promise<AxiosResponse<JSON>>;
export declare function streamRequest(targetUrl: string, timeoutSeconds?: number): Readable;
interface PostStreamRequestParams {
    hostname: string;
    source: Readable;
}
export declare function httpsStreamPostRequest(params: PostStreamRequestParams, useProxy?: boolean): Promise<Buffer>;
export declare function get<K>(url: string, config?: {
    useProxy: boolean;
}): Promise<K>;
export declare function putStream<K>(url: string, content: Readable, config?: {
    useProxy: boolean;
}, controller?: AbortController): Promise<K>;
export {};
