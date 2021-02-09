import { expect } from 'chai'
import { randomBytes } from 'crypto'
import { Readable } from 'stream'

import { NodeResponse } from '../../src/lib/utils/mocks/node'
import { spawn } from '../../src/lib/utils/mocks'

const node   = spawn.node({})
const bridge = spawn.bridge({})
const mirror = spawn.mirror({ node, bridge })

const shardStream = new Readable({
    read () {
        this.push(randomBytes(32))
        this.push(null)
    }
})

describe('# Mirror', () => {
    describe('UploadShard()', () => {
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

    describe('DownloadShardRequest()', () => {
        it('Should return a readable with the injected size', async () => {
            const size = 50
            const successRes = new NodeResponse(true, 200, '', size)
            node.nodeResponse = successRes

            const config = { bridgeUser: 'fake', bridgePass: 'fake' }
            const hash = randomBytes(32).toString('hex')
            const token = randomBytes(32).toString('hex')

            const shardStream = mirror.DownloadShardRequest(config, node.path, node.port, hash, token, node.ID)

            expect(shardStream).to.be.instanceOf(Readable)
            shardStream.on('end', () => expect(shardStream.readableLength).to.be.equal(size))
        })  
    })

    describe('DownloadShard()', () => {
        it('Should return a readable with the injected size', async () => {
            const size = 50
            const successRes = new NodeResponse(true, 200, '', size)
            node.nodeResponse = successRes

            const config = { bridgeUser: 'fake', bridgePass: 'fake' }
            const hash = randomBytes(32).toString('hex')
            const token = randomBytes(32).toString('hex')

            const shardStream = mirror.DownloadShardRequest(config, node.path, node.port, hash, token, node.ID)

            expect(shardStream).to.be.instanceOf(Readable)
            shardStream.on('end', () => expect(shardStream.readableLength).to.be.equal(size))
        })  
    })
})