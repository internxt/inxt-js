import path from 'path'
import url from 'url'
import axios, { AxiosRequestConfig } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256 } from '../lib/crypto'

class AuthMethod {
  static BasicAuth: string = "1"
}

export function authmethod(authMethod: string) {
  if (authMethod === AuthMethod.BasicAuth) {

  }
}

export function request(config: EnvironmentConfig, method: AxiosRequestConfig['method'], targetUrl: string, params: AxiosRequestConfig, callback: Function) {
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