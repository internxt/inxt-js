import { ClientRequest } from 'http';
import { EventEmitter } from 'events';
import axios, { AxiosRequestConfig, Canceler } from 'axios';

import { request } from '../services/request';
import { EnvironmentConfig } from '../api';

export enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
}

export class INXTRequest extends EventEmitter {
  private req: Promise<any> | ClientRequest | undefined;
  private config: EnvironmentConfig;
  private cancel: Canceler;
  private useProxy: boolean;
  private streaming = false;

  method: Methods;
  targetUrl: string;
  params: AxiosRequestConfig;

  constructor(
    config: EnvironmentConfig,
    method: Methods,
    targetUrl: string,
    params: AxiosRequestConfig,
    useProxy?: boolean,
  ) {
    super();

    this.method = method;
    this.config = config;
    this.targetUrl = targetUrl;
    this.useProxy = useProxy ?? false;
    this.params = params;

    this.cancel = () => null;
  }

  start<K>(): Promise<K> {
    // TODO: Abstract from axios
    const source = axios.CancelToken.source();
    this.cancel = source.cancel;

    const cancelToken = source.token;

    this.req = request(
      this.config,
      this.method,
      this.targetUrl,
      { ...this.params, cancelToken },
      this.useProxy,
    ).then<JSON>((res) => res.data);

    return this.req;
  }

  abort() {
    if (this.streaming && this.req instanceof ClientRequest) {
      return this.req.destroy();
    }

    this.cancel();
  }
}
