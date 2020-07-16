import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256 } from '../lib/crypto'
import { Transform, Duplex } from 'stream'
import { IncomingMessage } from 'http'

const BufferToStream = require('buffer-to-stream')

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
  const RequestReader = new Transform({ transform(c, e, cb) { cb(null, c) } })

  axios.get(targetUrl, {
    responseType: 'arraybuffer'
  }).then((axiosRes: AxiosResponse<ArrayBuffer>) => {
    BufferToStream(Buffer.from(axiosRes.data)).pipe(RequestReader)
  })

  return RequestReader
}