/// <reference types="node" />
import { Readable } from 'stream';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '../api';
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean): Promise<AxiosResponse<JSON>>;
export declare function streamRequest(targetUrl: string, timeoutSeconds?: number): Readable;
export declare function get<K>(url: string, config?: {
    useProxy: boolean;
}): Promise<K>;
export declare function getStream(url: string, config?: {
    useProxy: boolean;
}): Promise<Readable>;
