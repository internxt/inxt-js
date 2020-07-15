import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256, sha256HashBuffer } from '../lib/crypto'
import { Transform } from 'stream'
import { IncomingMessage } from 'http'

const  BufferToStream = require('buffer-to-stream')

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
    responseType: 'arraybuffer'
  }

  const RequestReader = new Transform({ transform(chunk, encoding, callback) { callback(null, chunk) }, defaultEncoding: 'binary' })

  axios.get(targetUrl, forcedOptions).then((axiosRes: AxiosResponse<Buffer>) => {
    // Buffer.from is not redundant since axios response is an array buffer on browsers

    /*
      Aquí el problema es que necesitamos un stream con los datos de la request.
      Axios tiene la opción de poner el parámetro 'stream' en responseType.
      El problema es que 'stream' sólo funciona en NodeJS, en navegadores devuelve un string.
      Si elegimos como opción ArrayBuffer, en NodeJS nos devolverá la info como un Buffer.
      Pero en navegador, ArrayBuffer devuelve un veradero ArrayBuffer, incompatible con Buffer.
      Por tanto, Buffer.from asegura que la respuesta siempre sea un Buffer, en NODEJS será redundante,
      ya que está convirtiendo un Buffer en Buffer, pero en navegador, asegura que ArrayBuffer será un Buffer.
    */
    BufferToStream(Buffer.from(axiosRes.data)).pipe(RequestReader)
  }).catch(err => {
    RequestReader.emit('error', err)
  })

  return RequestReader
}