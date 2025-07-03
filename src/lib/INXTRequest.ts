import { ClientRequest } from 'http';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import axios, { AxiosRequestConfig, AxiosResponse, Canceler } from 'axios';

import { request, streamRequest } from '../services/request';
import { ProxyManager, getProxy } from '../services/proxy';
import { EnvironmentConfig } from '../api';

export enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE'
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

  static Events = {
    UploadProgress: 'upload-progress',
    DownloadProgress: 'download-progress',
  };

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

  async stream<K>(content: Readable, size: number): Promise<AxiosResponse<K>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stream<K>(): Promise<Readable>;
  async stream<K>(content?: any, size?: number): Promise<any> {
    if (size) {
      return this.postStream<K>(content, size);
    }

    return this.getStream();
  }

  private async getStream(): Promise<Readable> {
    this.streaming = true;

    let proxy: ProxyManager | undefined;

    if (this.useProxy) {
      proxy = await getProxy();
    }

    const targetUrl = `${proxy && proxy.url ? proxy.url + '/' : ''}${this.targetUrl}`;

    return streamRequest(targetUrl);
  }

  private async postStream<K>(content: Readable, size: number): Promise<K> {
    this.streaming = true;

    let proxy: ProxyManager | undefined;

    if (this.useProxy) {
      proxy = await getProxy();
    }

    const targetUrl = `${proxy && proxy.url ? proxy.url + '/' : ''}${this.targetUrl}`;

    return axios
      .post<K>(targetUrl, content, {
        maxContentLength: Infinity,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': size.toString(),
        },
      })
      .then((res) => {
        proxy?.free();

        return res as unknown as K;
      });
  }

  abort() {
    if (this.streaming && this.req instanceof ClientRequest) {
      return this.req.destroy();
    }

    this.cancel();
  }

  isCancelled(err: Error): boolean {
    return axios.isCancel(err);
  }
}
