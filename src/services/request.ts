import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256, sha256HashBuffer } from '../lib/crypto'
import { Transform } from 'stream'
import { IncomingMessage } from 'http'

export async function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, callback: Function) {
  const DefaultOptions: AxiosRequestConfig = {
    method: method,
    auth: {
      username: config.bridgeUser,
      password: sha256(Buffer.from(config.bridgePass)).toString('hex')
    },
    url: targetUrl
  }

  const options = { ...DefaultOptions, ...params }

  return axios.request(options)
}

export function streamRequest(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, dataSize: number, callback: Function): Transform {
  const forcedOptions: AxiosRequestConfig = {
    responseType: 'stream'
  }

  const RequestReader = new Transform({ transform(chunk, encoding, callback) { callback(null, chunk) }, defaultEncoding: 'binary' })

  axios.get(targetUrl, forcedOptions).then((axiosRes: AxiosResponse<IncomingMessage>) => {
    axiosRes.data.pipe(RequestReader)
  }).catch(err => {
    RequestReader.emit('error', err)
  })

  return RequestReader
}