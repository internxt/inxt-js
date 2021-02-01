import { randomBytes } from 'crypto'
import { EnvironmentConfig } from '../../../..'
import { Shard } from '../../../../api/shard'
import { Transform } from 'stream'

export class MirrorMock {
    mirror: Shard

    constructor (mirror: Shard) {
        this.mirror = mirror
    }

    UploadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes: Array<string> = []): Promise<Transform | never> {
        /*
          1. Files are encrypted
          2. Encrypted files are split into shards
          3. Audit pre-processing
          4. Transmit shards to the network: Call node mock
        */
    }

    static randomMirror () : Shard {
        const index = 0
        const hash = randomBytes(32).toString('hex')
        const size = Math.random() * 10000
        const parity = true
        const token = randomBytes(32).toString('hex')
        const farmer = {
            userAgent: 'Mozilla/5.0',
            protocol: '1.2.0-INXT',
            address: 'www.fakeaddress.com',
            port: 3000,
            nodeID: randomBytes(32).toString('hex'),
            lastSeen: new Date()
        }
        const operation = ''
        return { index, hash, size, parity, token, farmer, operation }
    }
}