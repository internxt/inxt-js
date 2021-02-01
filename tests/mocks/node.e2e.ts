import { expect } from 'chai'
import * as m from '../../src/lib/utils/mocks'

const HTTPStatusCodes = m.HTTPStatusCodes
const NodeResponse = m.NodeResponse
const ContentType = m.ContentType
const CaseNotImplementedError = m.CaseNotImplementedError
const NodeMock = m.NodeMock
const NodeRequestHeaders = m.NodeRequestHeaders
const NodeRequest = m.NodeRequest

const port = 3000
const ID = 'jdojfojfj278745843202zdjjef'
const hostname = 'http://somerandom.node.dev'
const hash = '2aa046774a2a0c286656de628fbacc2f8108fd7b'
const token = '0933ccd5bd93f0f5b70cdadea1ca4f322ed06d59'
const path = `/shards/${hash}?token=${token}`

const node = new NodeMock(port, path, ID, hostname)
const reqHeaders = new NodeRequestHeaders(ContentType.OCTET_STREAM, (0).toString()) 
const req = new NodeRequest(hostname, path, port, reqHeaders, token, hash)

describe('# Node Mock', () => {

    it('Setted and received responses are the same', async () => {
        const res = m.generateResponse(HTTPStatusCodes.OK, 2000)
        node.nodeResponse = res
        expect(await node.get(req)).to.deep.equal(res)
    })

    it('Setted and received response readables sizes are the same', async () => {
        const responseSize = 2000
        const nodeRes = m.generateResponse(HTTPStatusCodes.OK, responseSize)
        node.nodeResponse = nodeRes

        const res = await node.get(req)
        expect(res instanceof NodeResponse).to.be.true

        if(res instanceof NodeResponse) {
            res.on('end', () => {
                expect(res.content.readableLength).to.be.equal(responseSize)
            }) 
        }
    })
  
    it('Throws error when a case is not implemented yet', () => {
        // no content is not implemented
        expect(() => m.generateResponse(HTTPStatusCodes.NO_CONTENT, 2000))
            .to.throw(new CaseNotImplementedError().message)
    })
  
})