const ACTIONS = {
    REQUESTS_LISTS_OF_NODES: ''
}

const PROBLEMS = {

    NODE_NOT_AVAILABLE: {
        NAME: 'Node not available',
        SOLUTION: 'Reports to bridge and looks for other node'
    },

    SHARD_CORRUPTED: {
        NAME: 'Shard corrupted',
        SOLUTION: 'Regenerates shard from merkle tree'
    },

    

}

describe('# Download', () => {

    describe('Succesful case', () => {
        it('Requests list of nodes from the bridge', () => {})
        it('Retrieve shards from nodes', () => {})
        it('Reports to bridge', () => {})
        it('Generates shards hashes', () => {})
        it('Decrypts shards', () => {})
        it('Joines shards --> File', () => {})
    })

    describe('Solves problem: Shard corrupted', () => {
        it('Requests list of nodes from the bridge', () => {})
        it('Retrieve shards from nodes', () => {})
        it('Reports to bridge', () => {})
        it('Generates shards hashes', () => {})
        it('Decrypts shards', () => {})
        it('Joines shards --> File', () => {})
    })

    describe('Solves problem: node not available', () => {
        it('Requests list of nodes from the bridge', () => {})
        it('Node not available', () => {})
        it('Reports to bridge', () => {})
        it('Looks for other node', () => {})
        it('Decrypts shards', () => {})
        it('Joines shards --> File', () => {})
    })

})