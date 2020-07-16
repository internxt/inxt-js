import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256 } from '../lib/crypto'
import { Transform } from 'stream'
import { IncomingMessage } from 'http'
import fetch from 'node-fetch'

export async function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig): Promise<AxiosResponse<JSON>> {
  const DefaultOptions: AxiosRequestConfig = {
    method: method,
    auth: {
      username: config.bridgeUser,
      password: sha256(Buffer.from(config.bridgePass)).toString('hex')
    },
    url: targetUrl
  }

  const options = { ...DefaultOptions, ...params }

  return axios.request<JSON>(options)
}

export function streamRequest(targetUrl: string): Transform {
  const RequestReader = new Transform({ transform(chunk, enc, callback) { callback(null, chunk) }, defaultEncoding: 'binary' })
  fetch(targetUrl).then(response => response.body.pipe(RequestReader))
  return RequestReader
}