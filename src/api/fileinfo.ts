import { EnvironmentConfig } from '../index'
import { doUntil } from 'async'
import { request } from '../services/request'
import { Shard } from './shard'
import { ShardObject } from './ShardObject'
import { AxiosResponse, AxiosError } from 'axios'
import { getProxy } from '../services/proxy'

export interface FileInfo {
  bucket: string
  mimetype: string
  filename: string
  frame: string
  size: number
  id: string
  created: Date
  hmac: {
    value: string
    type: string
  }
  erasure: {
    type: string
  }
  index: string
}

export async function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<FileInfo> {
  const proxy = await getProxy()

  return request(config, 'get', `${proxy.url}/${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}/info`, {}).then<FileInfo>((res: AxiosResponse) => res.data).catch((err: AxiosError) => {
    proxy.free()
    switch (err.response?.status) {
      case 404:
        throw Error(err.response.data.error)
      default:
        throw Error('Unhandled error: ' + err.message)
    }
  })
}

export async function GetFileMirror(config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes: Array<string> = []): Promise<Shard[]> {
  const excludeNodeIds: string = excludeNodes.join(',')
  const proxy = await getProxy()

  return request(config,
    'GET',
    `${proxy.url}/${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}?limit=${limit}&skip=${skip}&exclude=${excludeNodeIds}`,
    {
      responseType: 'json'
    }).then((res: AxiosResponse) => {
      proxy.free()
      return res.data
    })
}

export function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<Shard[]> {
  const shards: Shard[] = []

  return doUntil((next: (err: Error | null, results?: Array<Shard>, shards?: Shard[]) => void) => {
    GetFileMirror(config, bucketId, fileId, 3, shards.length).then((results: any) => {
      results.forEach((shard: Shard) => {
        shards.push(shard)
      })
      next(null, results, shards)
    }).catch((err) => {
      next(err)
    })
  }, (results: any, totalShard: any, next: any) => {
    return next(null, results.length === 0)
  }).then((result: any) => result[1])
}
