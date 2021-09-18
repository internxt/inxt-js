import * as url from 'url';
import * as https from 'https';
import * as http from 'http';
import { Readable } from 'stream';
import { ClientRequest, IncomingMessage } from 'http';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { EnvironmentConfig } from '..';
import { sha256 } from '../lib/crypto';
import { getProxy, ProxyManager } from './proxy';
import { Methods } from './api';

import fetch, { Response } from 'node-fetch';
import { wrap } from '../lib/utils/error';
import AbortController from 'abort-controller';

export async function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, useProxy = true): Promise<AxiosResponse<JSON>> {
  let reqUrl = targetUrl;
  let proxy: ProxyManager;

  if (useProxy) {
    proxy = await getProxy();
    reqUrl = `${proxy.url}/${targetUrl}`;
  }

  const DefaultOptions: AxiosRequestConfig = {
    method,
    auth: {
      username: config.bridgeUser,
      password: sha256(Buffer.from(config.bridgePass)).toString('hex')
    },
    url: reqUrl,
    maxContentLength: Infinity
  };

  const options = { ...DefaultOptions, ...params };

  return axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    if (useProxy && proxy) { proxy.free(); }

    return value;
  });
}

export function streamRequest(targetUrl: string, timeoutSeconds?: number): Readable {
  const uriParts = url.parse(targetUrl);
  let downloader: ClientRequest | null = null;

  function _createDownloadStream(): ClientRequest {
    const requestOpts = {
      protocol: uriParts.protocol,
      hostname: uriParts.hostname,
      port: uriParts.port,
      path: uriParts.path,
      headers: {
        'content-type': 'application/octet-stream'
      }
    };

    return uriParts.protocol === 'http:' ? http.get(requestOpts) : https.get(requestOpts);
  }

  return new Readable({
    read() {
      if (!downloader) {
        downloader = _createDownloadStream();

        if (timeoutSeconds) {
          downloader.setTimeout(timeoutSeconds * 1000, () => {
            downloader?.destroy(Error(`Request timeouted after ${timeoutSeconds} seconds`));
          });
        }

        downloader.on('response', (res: IncomingMessage) => {
          res
            .on('data', this.push.bind(this))
            .on('error', this.emit.bind(this, 'error'))
            .on('end', () => {
              this.push.bind(this, null);
              this.emit('end');
            }).on('close', this.emit.bind(this, 'close'));
        })
        .on('error', this.emit.bind(this, 'error'))
        .on('timeout', () => this.emit('error', Error('Request timeout')));
      }
    }
  });
}

interface PostStreamRequestParams {
  hostname: string;
  source: Readable;
}

export async function httpsStreamPostRequest(params: PostStreamRequestParams, useProxy = true): Promise<Buffer> {
  let targetUrl = params.hostname;
  let free: () => void;

  if (useProxy) {
    const proxy = await getProxy();
    targetUrl = `${proxy.url}/${params.hostname}`;
    free = proxy.free;
  }

  const reqUrl = new url.URL(targetUrl);

  return new Promise((resolve, reject) => {
    const req = https.request({
      protocol: 'https:',
      method: 'POST',
      hostname: reqUrl.hostname,
      path: reqUrl.pathname,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    }, (res: IncomingMessage) => {
      let dataResponse = Buffer.alloc(0);

      res.on('error', (err) => {
        if (free) {
          free();
        }
        reject(err);
      });
      res.on('data', d => {
        dataResponse = Buffer.concat([dataResponse, d]);
      });
      res.on('end', () => {
        if (free) {
          free();
        }
        if (res.statusCode && res.statusCode > 399) {
          return reject(new Error(dataResponse.toString()));
        }
        resolve(dataResponse);
      });
    });

    params.source.pipe(req);
  });
}

export async function get<K>(url: string, config = { useProxy: false }): Promise<K> {
  let targetUrl = url;
  let free: undefined | (() => void);

  if (config.useProxy) {
    const proxy = await getProxy();
    free = proxy.free;
    targetUrl = `${proxy.url}/${targetUrl}`;
  }

  return axios.get<K>(targetUrl).then((res) => {
    if (free) {
      free();
    }

    return res.data;
  });
}

export async function getStream(url: string, config = { useProxy: false }): Promise<Readable> {
  let targetUrl = url;
  let free: undefined | (() => void);

  if (config.useProxy) {
    const proxy = await getProxy();
    free = proxy.free;
    targetUrl = `${proxy.url}/${targetUrl}`;
  }

  return streamRequest(url);
}

export async function putStream<K>(url: string, content: Readable, config = { useProxy: false }, controller?: AbortController): Promise<K> {
  let targetUrl = url;
  let free: undefined | (() => void);

  if (config.useProxy) {
    const proxy = await getProxy();
    free = proxy.free;
    targetUrl = `${proxy.url}/${targetUrl}`;
  }

  return fetch(targetUrl, { method: Methods.Put, body: content, signal: controller && controller.signal }).then((res: Response) => {
    if (free) {
      free();
    }

    if (res.status >= 400) {
      throw new Error(`Server responded with status code ${res.status}`);
    }

    return res as any;
  }).catch((err) => {
    throw wrap('PutStreamError', err);
  }); 
}
