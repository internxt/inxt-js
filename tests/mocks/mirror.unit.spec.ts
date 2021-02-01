import { expect } from "chai"
import { randomBytes } from 'crypto'
import { Readable } from 'stream'

import { MirrorMock } from '../../src/lib/utils/mocks/bridge/mirror'
import { NodeMock, NodeResponse } from '../../src/lib/utils/mocks/node'

const mirror = new MirrorMock()
const node = new NodeMock(3000, '/path/to/node', randomBytes(32).toString('hex'), 'www.fakenode.com')

const shardStream = new Readable({
    read () {
        this.push(randomBytes(32))
        this.push(null)
    }
})

describe('# Mirror', () => {
    it('Should finish the upload correctly', async () => {
        const successRes = new NodeResponse(true, 200, '', 32)
        node.nodeResponse = successRes
        expect(await mirror.UploadShard(node, shardStream)).to.be.true
    })  

    it('Should finish the upload with error', async () => {
        const errorRes = new NodeResponse(false, 401, '', 32)
        node.nodeResponse = errorRes
        expect(await mirror.UploadShard(node, shardStream)).to.be.false
    })
})