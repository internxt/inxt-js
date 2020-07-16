/// <reference types="node" />
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
import { Transform } from 'stream';
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig): Promise<AxiosResponse<JSON>>;
export declare function streamRequest(targetUrl: string): Transform;
