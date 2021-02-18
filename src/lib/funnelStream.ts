import { Transform } from 'stream'

interface RawShard {
    size: number
    index: number
}

export class FunnelStream extends Transform {
    private limit: number;
    public totalShards = 0
    private indexCounter = 0

    public shards: RawShard [];
    private buffer: Buffer
    private bufferOffset = 0
    private lastChunkLength = 0

    constructor (limit = 1) {
        super()
        this.limit = limit
        this.shards = []
        this.buffer = Buffer.alloc(limit)
    }

    private bufferStillHasData () : boolean {
        return this.bufferOffset != 0
    } 

    private bufferIsEmpty () : boolean {
        return this.bufferOffset == 0
    }

    private pushToReadable (b: Buffer) : void {
        this.pushShard(b.byteLength)
        this.push(b)
    }

    private pushBuffer () : void {
        this.pushToReadable(this.buffer)
    }

    private pushShard (size: number) : void {
        this.shards.push({ size, index: this.indexCounter })
        this.incrementIndexCounter()
    }

    private incrementIndexCounter () : void {
        this.indexCounter++
    }

    _transform (chunk: Buffer, enc: string, done: (err: Error | null) => void) : void {

        if (this.bufferStillHasData()) {
            const bytesToPush = (this.limit - this.bufferOffset)

            const enoughToFillBuffer = () => chunk.length >= bytesToPush
            const completeBuffer = () => chunk.copy(this.buffer, this.bufferOffset, 0, bytesToPush)
            const addToBuffer = () => chunk.copy(this.buffer, this.bufferOffset)
            const resetOffset = () => this.bufferOffset = 0
            const incrementOffset = (increment: number) => this.bufferOffset += increment 
            
            if (enoughToFillBuffer()) {
                completeBuffer()

                this.pushBuffer()

                resetOffset()
                chunk = chunk.slice(0, chunk.length - bytesToPush)
            } else {
                addToBuffer()
                incrementOffset(chunk.length)
            }
        }

        const pushChunks = (buffer: Buffer, chunkSize: number) : Buffer => {
            let offset = 0
            let size = buffer.length

            const notIteratedEntireBuffer = () => size >= chunkSize

            while (notIteratedEntireBuffer()) {
                this.pushToReadable(buffer.slice(offset, offset + chunkSize))

                offset += chunkSize
                size -= chunkSize
            }

            return buffer.slice(offset, offset + size)
        }
        
        if (this.bufferIsEmpty()) {
            const remainingChunk = pushChunks(chunk, this.limit)

            if (remainingChunk.length) {
                remainingChunk.copy(this.buffer)

                this.lastChunkLength = remainingChunk.byteLength
                
                // last slice has to be added manually because we are going to fill it with zeroes at _flush
                this.pushShard(remainingChunk.byteLength)

                this.bufferOffset += remainingChunk.length
            }
        }

        done(null)
    }

    _flush (done: () => void) : void {
        if (this.bufferStillHasData()) {
            const removeZeroes = (buf: Buffer)  => buf.slice(0, this.lastChunkLength)
            this.push(removeZeroes(this.buffer))
        }
        done()
    }
}