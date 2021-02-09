import { Readable } from 'stream'

import { ExchangeReport } from '../../../../api/reports'
import { HashStream } from '../../../hashstream'

import { ContentType } from '../http'
import { NodeMock, NodeRequest, NodeRequestHeaders, NodeResponse } from '../node'
import { ExchangeReportMock } from './exchangeReport'
import { Shard } from '../../../../api/shard'
import { ripemd160 } from '../../../crypto'
import { BridgeMock, ShardReferenced } from './bridge'
import { EnvironmentConfig } from '../../../../../src'

export class MirrorMock {
    private _node: NodeMock
    private _bridge: BridgeMock

    constructor (node: NodeMock, bridge: BridgeMock) {
        this._node = node
        this._bridge = bridge
    }

    DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string, nodeID: string): Readable {
        const nh = new NodeRequestHeaders(ContentType.OCTET_STREAM, nodeID)
        const nr = new NodeRequest(address, '/shards', 3000, nh, token, hash)
        return this._node.get(nr).content
    }

    async DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes: Array<string> = []): Promise<Transform | never> {
        
        const hasher = new HashStream(shard.size)
        const exchangeReportMock = new ExchangeReportMock(new ExchangeReport(config))
        const shardBinary = this.DownloadShardRequest(config, shard.farmer.address, shard.farmer.port, shard.hash, shard.token, shard.farmer.nodeID)

        const outputStream = shardBinary.pipe<HashStream>(hasher)

        const finalShardHash: string = await new Promise((resolve) => {
            hasher.on('end', () => { resolve(ripemd160(hasher.read()).toString('hex')) })
        })

        exchangeReportMock.exchangeReport.params.dataHash = finalShardHash
        exchangeReportMock.exchangeReport.params.exchangeEnd = new Date()
        exchangeReportMock.exchangeReport.params.farmerId = shard.farmer.nodeID

        if(finalShardHash === shard.hash) {
            exchangeReportMock.DownloadOk()
            return outputStream
        } else {
            exchangeReportMock.DownloadError()
            excludedNodes.push(shard.farmer.nodeID)
            const otherMirrorResponse: Array<Shard>= await this._bridge.GetFileMirror(config, bucketId, fileId, 1, shard.index, excludedNodes)

            const maybeOtherMirror: Shard = otherMirrorResponse[0]

            if (!maybeOtherMirror) {
                throw new Error('File missing shard error')
            } else {
                return this.DownloadShard(config, maybeOtherMirror, bucketId, fileId, excludedNodes)
            }
        }

    }

    async UploadShard(node: NodeMock, shardStream: Readable): Promise<boolean> {
        try {
            const nr: NodeResponse = await node.send(shardStream)
            return nr.status && nr.statusCode === 200
        } catch (e) {
            return false
        }
    }

}