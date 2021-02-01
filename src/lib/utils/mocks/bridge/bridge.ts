import { EnvironmentConfig } from '../../../..'
import { Shard } from '../../../../api/shard'
import { randomBytes } from 'crypto'

interface ShardReferenced extends Shard {
    fileId: string,
    bucketId: string
}

export const BRIDGE_ERRORS = {
    DEFAULT: 'bridge error'
}
export class BridgeMock {
    mirrors: ShardReferenced[]
    DEFAULT_BRIDGE_ERROR_MESSAGE = 'bridge reject'

    constructor (mirrors: ShardReferenced[]) {
        this.mirrors = mirrors
    }

    // fileinfo.ts 'GetFileMirror'
    GetFileMirror (config: EnvironmentConfig, bucketId: string, fileId: string, limit: number | 3, skip: number | 0, excludeNodes: Array<string> = []) : Promise<ShardReferenced[]> {
        const mirrorsIncluded = []

        for(const mirror of this.mirrors) {
            if (excludeNodes.findIndex((nodeId) => nodeId === mirror.farmer.nodeID) === -1) {
                mirrorsIncluded.push(mirror)
            }
        }

        const mirrorsLimited = this._limit(mirrorsIncluded.filter(m => m.fileId === fileId && m.bucketId === bucketId), limit)
        const mirrorsSkipped = this._skip(mirrorsLimited, skip)
        return Promise.resolve(mirrorsSkipped)
    }

    private _limit (m: ShardReferenced[], limit: number) : ShardReferenced [] {
        return m.slice(0, limit)
    }

    private _skip (m: ShardReferenced[], skip: number): ShardReferenced [] {
        return m.slice(skip, m.length)
    }

    resolve () : Promise<boolean> {
        return Promise.resolve(true)
    }

    reject () : Promise<void> {
        return Promise.reject(BRIDGE_ERRORS.DEFAULT)
    }
}

export const generateShardReferenced = (index: number, hash: string, nodeID: string, fileId: string, bucketId: string) : ShardReferenced => {
    return {
        index,
        hash: randomBytes(32).toString('hex'),
        size: 10000,
        parity: true ,
        token: randomBytes(32).toString('hex'),
        farmer: {
            userAgent: 'Mozilla 5.0',
            protocol: '1.2.0-INXT',
            address: 'www.fakeaddress.com',
            port: 3000,
            nodeID,
            lastSeen: new Date()
        },
        operation: '',
        fileId,
        bucketId
    }
}