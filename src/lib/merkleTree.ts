import stream from 'stream'
import { createCipheriv, randomBytes, createHash, Cipher } from 'crypto'
import { ripemd160, sha256 } from './crypto'

export class Shard {
    public encrypted: Buffer
    public raw: Buffer
    private _cipher: Cipher
    public challenge: Buffer
    public preleaf: Buffer
    public leaf: Buffer

    constructor () {
        this.raw = Buffer.alloc(0)
    }

    public reset () : void {
        this.raw = Buffer.alloc(0)
    }

    public set cipher (c: Cipher) {
        this._cipher = c
    }

    public add (chunk: Buffer) : void {
        this.raw = Buffer.concat([this.raw, chunk])
        this._cipher.write(chunk)
    }

    public size () : number {
        return this.raw.length 
    }

    public encrypt () : Buffer {
        this.encrypted = this._cipher.final()
        return this.encrypted
    }

    public generateChallenge () : Buffer {
        this.challenge = randomBytes(32)
        return this.challenge
    }

    public generatePreleaf () : Buffer {
        const preleafBuffer = Buffer.concat([this.challenge, this.encrypted])
        this.preleaf = ripemd160(sha256(preleafBuffer))
        return this.preleaf
    }

    public generateLeaf () : Buffer {
        this.leaf = ripemd160(sha256(this.preleaf))
        return this.leaf
    }

    public fillUp (limit: number) : void {
        const zeroes = Buffer.alloc(limit - this.size())
        this.raw = Buffer.concat([this.raw, zeroes])
    }
    
}

export class MerkleTree {

    private leaves: any[];
    private preleaves: any[];
    private file: stream.Readable;
    private filePointer: number;
    private shards: Shard[];
    private algorithm: string;
    private iv: Buffer;
    private key: string;

    constructor(file: Buffer | stream.Readable) {
        this.file = file instanceof Buffer ? stream.Readable.from(file.toString()) : file
        this.filePointer = 0
        this.shards = []
        this.algorithm = 'aes-256-ctr'
        this.iv = randomBytes(16)
        const secret = '12345678123456781234567812345678'
        this.key = createHash('sha256').update(String(secret)).digest('base64').substr(0, 32)
    }

    public using (algorithm: string) : MerkleTree {
        this.algorithm = algorithm
        return this
    }

    public generate () : Promise<any>  {
        return new Promise((resolve:(value: any) => void, reject: (reason?: any) => void) => {
            
            const limit = 100
            const shard: Shard = new Shard()

            shard.cipher = createCipheriv(this.algorithm, this.key, this.iv)

            this.file.on('data', (chunk: string) => {
                if (shard.size() < limit) {
                    shard.add(Buffer.from(chunk, 'utf-8'))
                } else {
                    this.file.pause()

                    shard.generateChallenge()
                    shard.encrypt()
                    shard.generatePreleaf()
                    shard.generateLeaf()

                    this.shards.push(Object.assign({}, shard))
                    this.preleaves.push(shard.preleaf)
                    this.leaves.push(shard.leaf)

                    console.log('Preleaf: ', shard.preleaf.toString('hex'))
                    console.log('Leaf: ', shard.leaf.toString('hex'))

                    // reuse the same object
                    shard.reset()

                    this.file.resume()
                }
            })

            this.file.on('end', () => {
                if(shard.size() > 0) {
                    // last slice remaining, refill with zeroes until limit
                    console.log('a slice remaining: %s bytes',shard.raw.length)

                    shard.fillUp(limit)
                    console.log('filled up: %s bytes',shard.raw.length)

                    console.log('raw')
                    console.log(shard.raw.toString('hex'))

                    shard.generateChallenge()
                    shard.encrypt()
                    shard.generatePreleaf()
                    shard.generateLeaf()

                    console.log('Preleaf: ', shard.preleaf.toString('hex'))
                    console.log('Leaf: ', shard.leaf.toString('hex'))
                }
                resolve('')
            })

        })
    }
}