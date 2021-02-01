import { Readable } from 'stream'
import { NodeMock, NodeResponse } from '../node'

export class MirrorMock {

    async DownloadShard () {
        // TODO
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