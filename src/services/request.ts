import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { EnvironmentConfig } from '..'
import { sha256 } from '../lib/crypto'
import { Readable } from 'stream'
import https from 'https'
import { ClientRequest, IncomingMessage } from 'http'
import url from 'url'

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