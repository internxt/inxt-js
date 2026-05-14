import * as https from 'https';
import * as http from 'http';
import { Readable } from 'stream';
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

  return await axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    if (useProxy && proxy) {
      proxy.free();
    }

    return value;
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

  const protocol = new URL(targetUrl).protocol === 'http:' && !config.useProxy ? http : https;

  return new Promise((resolve, reject) => {
    protocol.get(targetUrl, (res) => {
      if (free) {
        free();
      }

      if (res.statusCode) {
        if (res.statusCode === 404) {
          return reject(Error('Object not found'));
        }

        if (res.statusCode >= 400) {
          return reject(Error(`Storage failed with status code ${res.statusCode}: ${res.statusMessage}`));
        }
      }
      resolve(res);
    });
  });
}
