import { AxiosRequestConfig } from 'axios';
import { EnvironmentConfig } from '..';
export declare function authmethod(authMethod: string): void;
export declare function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, callback: Function): Promise<import("axios").AxiosResponse<any>>;
