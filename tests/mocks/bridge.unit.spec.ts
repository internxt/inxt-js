import { expect } from "chai"

import { randomBytes } from 'crypto'
import { BridgeMock, generateShardReferenced } from "../../src/lib/utils/mocks"

/* ============== SAMPLE DATA ============= */
const randomId = () => randomBytes(32).toString('hex')

const fileZero = { id: randomId(), bucketId: randomId() }
const fileOne =  { id: randomId(), bucketId: randomId() }

const shardZero = { index: 0, hash: randomId(), nodeId: randomId(), fileId: fileZero.id, bucketId: fileZero.bucketId }
const shardOne =  { index: 1, hash: randomId(), nodeId: randomId(), fileId: fileZero.id, bucketId: fileZero.bucketId }
const shardTwo =  { index: 2, hash: randomId(), nodeId: randomId(), fileId: fileZero.id, bucketId: fileZero.bucketId }
const shardThree = { index: 0, hash: randomId(), nodeId: randomId(), fileId: fileOne.id, bucketId: fileOne.bucketId }

const sZero = generateShardReferenced(shardZero.index, shardZero.hash, shardZero.nodeId, shardZero.fileId, shardZero.bucketId)
const sOne  = generateShardReferenced(shardOne.index, shardOne.hash, shardOne.nodeId, shardOne.fileId, shardOne.bucketId)
const sTwo  = generateShardReferenced(shardTwo.index, shardTwo.hash, shardTwo.nodeId, shardTwo.fileId, shardTwo.bucketId)
const sThree = generateShardReferenced(shardThree.index, shardThree.hash, shardThree.nodeId, shardThree.fileId, shardThree.bucketId)

const shardsReferenced = [sZero, sOne, sTwo, sThree]
/* ======================================== */

const bridge = new BridgeMock(shardsReferenced)
const fakeEnv = { bridgeUser: 'fake', bridgePass: 'fake'}

describe('# Bridge Mock', () => {

    describe('GetFileMirror()', () => {
        it('Returns only shards related to bucketId and fileId', async () => {
            const mirrors = await bridge.GetFileMirror(fakeEnv, sZero.bucketId, sZero.fileId, 3, 0)
            expect(mirrors.length).to.equal([sZero, sOne, sTwo].length)
        })
    
        it('Limits mirrors according to limit provided', async () => {
            const limit = 1
            const mirrors = await bridge.GetFileMirror(fakeEnv, sZero.bucketId, sZero.fileId, limit, 0)
            expect(mirrors.length).to.equal(limit)
        })
    
        it('Skips mirrors according to skip provided', async () => {
            const limit = 3
            const skip = 1
            const mirrors = await bridge.GetFileMirror(fakeEnv, sZero.bucketId, sZero.fileId, limit, skip)
    
            expect(mirrors.length).to.equal(2)
            expect(mirrors[0]).to.deep.equal(sOne)
            expect(mirrors[1]).to.deep.equal(sTwo)
        })

        it('Excludes mirrors whose nodeId matches with excluded list', async () => {
            const limit = 3
            const excludedNodes = [sOne.farmer.nodeID]
            const mirrors = await bridge.GetFileMirror(fakeEnv, sZero.bucketId, sZero.fileId, limit, 0, excludedNodes)
    
            expect(mirrors.length).to.equal(2)
            expect(mirrors[0]).to.deep.equal(sZero)
            expect(mirrors[1]).to.deep.equal(sTwo)
        })
    })
    
  
})