import { EnvironmentConfig } from '../index'
import { doUntil } from 'async'
import { request } from '../services/request'
import { Shard } from './shard'
import { ShardObject } from './ShardObject'
import { AxiosResponse } from 'axios'

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

export function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<FileInfo> {
  return request(config, 'get', `https://api.internxt.com:8081/${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}/info`, {}).then<FileInfo>((res: AxiosResponse) => res.data)
}

export function GetFileMirror(config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes: Array<string> = []): Promise<Shard[]> {
  const excludeNodeIds: string = excludeNodes.join(',')
  return request(config,
    'GET',
    `https://api.internxt.com:8081/${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}?limit=${limit}&skip=${skip}&exclude=${excludeNodeIds}`,
    {
      responseType: 'json'
    }).then((res: AxiosResponse) => {
      return res.data
    })
}

export function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<Map<number, Shard>> {
  const shards: Map<number, Shard> = new Map<number, Shard>()

  return doUntil((next: (err: Error | null, results?: Array<Shard>, shards?: Map<number, Shard>) => void) => {
    GetFileMirror(config, bucketId, fileId, 3, shards.size).then((results: any) => {
      results.forEach((shard: Shard) => {
        shards.set(shard.index, shard)
      })
      next(null, results, shards)
    }).catch((err) => {
      next(err)
    })
  }, (results: any, totalShard: any, next: any) => {
    return next(null, results.length === 0)
  }).then((result: any) => result[1])
}
