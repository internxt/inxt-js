import * as url from 'url';
import * as https from 'https';
import * as http from 'http';
import { Readable } from 'stream';
import { ClientRequest, IncomingMessage } from 'http';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { EnvironmentConfig } from '../api';
import { sha256 } from '../lib/utils/crypto';
import { getProxy, ProxyManager } from './proxy';

export async function request(
  config: EnvironmentConfig,
  method: AxiosRequestConfig['method'],
  targetUrl: string,
  params: AxiosRequestConfig,
  useProxy = true,
): Promise<AxiosResponse<JSON>> {
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
      password: sha256(Buffer.from(config.bridgePass)).toString('hex'),
    },
    url: reqUrl,
    maxContentLength: Infinity,
  };

  const options = { ...DefaultOptions, ...params };

  return axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    if (useProxy && proxy) {
      proxy.free();
    }

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
        'content-type': 'application/octet-stream',
      },
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

        this.once('signal', (message: string) => {
          if (message === 'Destroy request') {
            downloader?.destroy();
          }

          this.destroy();
        });

        downloader
          .on('response', (res: IncomingMessage) => {
            res
              .on('data', this.push.bind(this))
              .on('error', this.emit.bind(this, 'error'))
              .on('end', () => {
                this.push.bind(this, null);
                this.emit('end');
              })
              .on('close', this.emit.bind(this, 'close'));
          })
          .on('error', this.emit.bind(this, 'error'))
          .on('timeout', () => this.emit('error', Error('Request timeout')));
      }
    },
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

  const getStream = streamRequest(targetUrl);

  if (free) {
    free();
  }

  return getStream;
}
