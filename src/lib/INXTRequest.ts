import { RequestOptions, request as httpsRequest } from 'https';
import { ClientRequest } from 'http';
import { parse } from 'url';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import axios, { AxiosRequestConfig, AxiosResponse, Canceler } from 'axios';

import { request } from '../services/request';
import { ProxyManager, getProxy } from '../services/proxy';
import { EnvironmentConfig } from '..';

enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT'
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
    DownloadProgress: 'download-progress'
  };

  constructor(config: EnvironmentConfig, method: Methods, targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean) {
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

    this.req = request(this.config, this.method, this.targetUrl, { ...this.params, cancelToken }, this.useProxy).then<JSON>(res => res.data);

    return this.req;
  }

  async stream<K>(content: Readable | Writable, size: number, options?: RequestOptions): Promise<AxiosResponse<K>> {
    this.streaming = true;

    let proxy: ProxyManager | undefined;

    if (this.useProxy) {
      proxy = await getProxy();
    }

    const targetUrl = `${proxy && proxy.url ? proxy.url + '/' : ''}${this.targetUrl}`;
    const uriParts = parse(targetUrl);

    this.req = httpsRequest({
      ...options,
      method: this.method,
      protocol: uriParts.protocol,
      hostname: uriParts.hostname,
      port: uriParts.port,
      path: uriParts.path,
      headers: {
        'Content-Length': size
      }
    });

    if (this.method === Methods.Get && content instanceof Writable) {
      const stream = this.req.pipe(content);

      return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('end', (x: any) => {
          proxy?.free();
          resolve(x);
        });
      });
    }

    return axios.post<K>(targetUrl, content, {
      maxContentLength: Infinity,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': size
      }
    }).then((res) => {
      proxy?.free();

      return res;
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
