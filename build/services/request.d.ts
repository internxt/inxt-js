/// <reference types="node" />
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
import { Transform } from 'stream';
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, callback: Function): Promise<AxiosResponse<any>>;
export declare function streamRequest(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, dataSize: number, callback: Function): Transform;
