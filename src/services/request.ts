import * as url from 'url';
import * as https from 'https';
import { Readable } from 'stream';
import { ClientRequest, IncomingMessage } from 'http';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { EnvironmentConfig } from '..';
import { sha256 } from '../lib/crypto';
import { getProxy, ProxyManager } from './proxy';

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
    return https.get({
      protocol: uriParts.protocol,
      hostname: uriParts.hostname,
      port: uriParts.port,
      path: uriParts.path,
      headers: {
        'content-type': 'application/octet-stream'
      }
    });
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
