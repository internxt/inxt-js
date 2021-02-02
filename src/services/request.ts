import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256 } from '../lib/crypto'
import { Readable } from 'stream'
import https from 'https'
import { ClientRequest, IncomingMessage } from 'http'
import url from 'url'

const INXT_API_URL = 'https://api.internxt.com'

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

export function streamRequest(targetUrl: string, nodeID: string): Readable {
  const uriParts = url.parse(targetUrl)
  let downloader: ClientRequest | null = null

  function _createDownloadStream(): ClientRequest {
    new https.Agent({ keepAlive: true, keepAliveMsecs: 25000 })

    return https.get({
      protocol: uriParts.protocol,
      hostname: uriParts.hostname,
      port: uriParts.port,
      path: uriParts.path,
      headers: {
        'content-type': 'application/octet-stream',
        'x-storj-node-id': nodeID
      }
    })
  }

  return new Readable({
    read: function () {
      if (!downloader) {
        downloader = _createDownloadStream()
        downloader.on('response', (res: IncomingMessage) => {
          res
            .on('data', this.push.bind(this))
            .on('error', this.emit.bind(this, 'error'))
            .on('end', () => {
              this.push.bind(this, null)
              this.emit('end')
            }).on('close', this.emit.bind(this, 'close'))
        }).on('error', this.emit.bind(this, 'error'))
      }
    }
  })
}

export function checkBucketExistance(config: EnvironmentConfig, bucketId: string, token:string, jwt: string, params: AxiosRequestConfig): Promise<AxiosResponse<JSON>> {
  const targetUrl = `${INXT_API_URL}/buckets/${bucketId}?token=${token}`
  const defParams: AxiosRequestConfig = {
    headers: {
      'User-Agent': 'libstorj-2.0.0-beta2',
      'Content-Type': 'application/octet-stream',
      Authorization: `Basic ${jwt}`,
    }
  }

  const finalParams = { ...defParams, ...params }
  return request(config, 'get', targetUrl, finalParams)
}


export function checkFileExistance(config: EnvironmentConfig, bucketId: string, fileId:string, jwt: string, params: AxiosRequestConfig): Promise<AxiosResponse<JSON>> {
  const targetUrl = `${INXT_API_URL}/buckets/${bucketId}/file-ids/${fileId}`
  const defParams: AxiosRequestConfig = {
    headers: {
      'User-Agent': 'libstorj-2.0.0-beta2',
      'Content-Type': 'application/octet-stream',
      Authorization: `Basic ${jwt}`,
    }
  }

  const finalParams = { ...defParams, ...params }
  return request(config, 'get', targetUrl, finalParams)
}


export function createFrame(config: EnvironmentConfig, jwt:string, params: AxiosRequestConfig): Promise <AxiosResponse<JSON>> {
  const targetUrl = `${INXT_API_URL}/frames`
  const defParams: AxiosRequestConfig = {
    headers: {
      'User-Agent': 'libstorj-2.0.0-beta2',
      'Content-Type': 'application/octet-stream',
      Authorization: `Basic ${jwt}`,
    }
  }

  const finalParams = { ...defParams, ...params }
  return request(config, 'post', targetUrl, finalParams)
}

interface CreateEntryFromFrameBody {
  frame: string,
  filename: string,
  index: string,
  hmac: {
    type: string,
    value: string
  }
}

/**
 * Creates a bucket entry from the given frame object
 * @param {EnvironmentConfig} config App config
 * @param {string} bucketId
 * @param {CreateEntryFromFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
export function createEntryFromFrame(config: EnvironmentConfig, bucketId: string, body: CreateEntryFromFrameBody, jwt: string, params: AxiosRequestConfig): Promise <AxiosResponse<JSON>> {
  const targetUrl = `${INXT_API_URL}/buckets/${bucketId}/files`
  const defParams: AxiosRequestConfig = {
    headers: {
      'User-Agent': 'libstorj-2.0.0-beta2',
      'Content-Type': 'application/octet-stream',
      Authorization: `Basic ${jwt}`,
    },
    data: body
  }

  const finalParams = { ...defParams, ...params }
  return request(config, 'post', targetUrl, finalParams)
}
