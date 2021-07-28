/// <reference types="node" />
import { Readable } from 'stream';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean): Promise<AxiosResponse<JSON>>;
export declare function streamRequest(targetUrl: string, timeoutSeconds?: number): Readable;
