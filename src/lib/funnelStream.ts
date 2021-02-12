import { Transform } from 'stream'

export class FunnelStream extends Transform {
    private limit: number;
    private chunk: Buffer;
    public totalShards = 0

    constructor (limit = 1) {
        super()
        this.limit = limit
    }

    _transform (chunk: Buffer) : void {
        this.chunk = chunk
        
        let start = 0
        let offset = 0
        const end = chunk.byteLength
        
        while (start < end) {
            offset = start + this.limit

            if (offset > end) {
                offset = end
            }

            this.push(chunk.slice(start, offset))
            this.totalShards++

            start += this.limit
        }
    }

    _flush (cb: (err: Error | null, data: Buffer) => void) {
        cb(null, this.chunk)
    }
}