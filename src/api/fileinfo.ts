import { EnvironmentConfig } from '../index'
import { GetBasicAuth } from './auth'
import { doUntil } from 'async'
import { request } from '../services/request'
import { Shard } from './shard'

export interface FileInfo {
  index: string,
  hmac: {
    value: string
  },
  filename: string
}

export function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string) {
  return request(config, 'GET', `https://api.internxt.com:8081/${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}/info`, { responseType: 'json' }, () => { }).then(res => {
    if (res.status !== 200) { throw res }
    return res.data
  })
}

export function GetFileMirror(config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes: Array<string> = []): Promise<Array<Shard>> {
  const excludeNodeIds: string = excludeNodes.join(',')
  console.log('Excluded', excludeNodes)
  return request(config, 'GET', `https://api.internxt.com:8081/${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}?limit=${limit}&skip=${skip}&exclude=${excludeNodeIds}`, { responseType: 'json' }, () => { }).then(res => {
    if (res.status !== 200) { throw res }
    return res.data
  })
}

export function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string) {
  const shards: JSON[] = []
  return doUntil((next: any) => {
    GetFileMirror(config, bucketId, fileId, 3, shards.length).then((results: any) => {
      shards.push(...results)
      next(null, results, shards)
    }).catch(next)
  }, (results: any, totalShard: any, next: any) => {
    return next(null, results.length === 0)
  }).then((result: any) => {
    return result[1]
  })
}
