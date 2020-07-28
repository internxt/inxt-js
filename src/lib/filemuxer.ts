import { Hash, createHash } from 'crypto'
import { Readable, PassThrough } from 'stream'
import assert from 'assert'
import { ripemd160 } from './crypto'

interface FileMuxerOptions {
  shards: number
  length: number
  sourceDrainWait?: number
  sourceIdleWait?: number
}

/**
 * Accepts multiple ordered input sources and exposes them as a single
 * contiguous readable stream. Used for re-assembly of shards.
 */
class FileMuxer extends Readable {

  static DEFAULTS = {
    sourceDrainWait: 8000,
    sourceIdleWait: 4000
  }

  private hasher: Hash
  public shards: number
  private length: number
  private inputs: PassThrough[] = []
  private bytesRead = 0
  private added = 0
  private options: FileMuxerOptions

  private sourceDrainTimeout: NodeJS.Timeout | null = null

  constructor(options: FileMuxerOptions) {
    super()

    this.checkOptions(options)

    this.hasher = createHash('sha256')
    this.shards = options.shards
    this.length = options.length

    this.options = { ...FileMuxer.DEFAULTS, ...options }
  }

  private checkOptions(options: FileMuxerOptions) {
    assert(typeof options.shards === 'number', 'You must supply a shards parameter')
    assert(options.shards > 0, 'Cannot multiplex a 0 shard stream')
    assert(typeof options.length === 'number', 'You must supply a length parameter')
    assert(options.length > 0, 'Cannot multiplex a 0 length stream')
  }

  private waitForSourceAvailable() {
    this.once('sourceAdded', this._read.bind(this))
    this.sourceDrainTimeout = setTimeout(() => {
      this.removeAllListeners('sourceAdded')
      // this.emit('error', new Error('Unexpected end of source stream'))
    }, this.options.sourceDrainWait ? this.options.sourceDrainWait : 8000)
  }

  private mux(bytes: Buffer) {
    this.bytesRead += bytes.length

    if (this.length < this.bytesRead) {
      return this.emit('error', new Error('Input exceeds expected length'))
    }

    this.hasher.update(bytes)
    return this.push(bytes)
  }

  /**
   * Implements the underlying read method
   * @private
   */
  _read(size?: number): boolean {
    if (this.sourceDrainTimeout) {
      clearTimeout(this.sourceDrainTimeout)
    }

    if (this.bytesRead === this.length) {
      return this.push(null)
    }

    if (!this.inputs[0]) {
      this.waitForSourceAvailable()
      return true
    }

    const readFromSource = (size?: number) => {
      const bytes = this.inputs[0] ? this.inputs[0].read(size) : null
      if (bytes !== null) {
        return this.mux(bytes)
      }
      setTimeout(readFromSource.bind(this), this.options.sourceIdleWait)
    }

    readFromSource(size)
    return true
  }

  /**
   * Adds an additional input stream to the multiplexer
   * @param readable - Readable input stream from file shard
   * @param hash - Hash of the shard
   * @param echangeReport - Instance of exchange report
   */
  addInputSource(readable: Readable, shardSize: number, hash: Buffer, echangeReport: any): FileMuxer {
    assert(typeof readable.pipe === 'function', 'Invalid input stream supplied')
    assert(this.added < this.shards, 'Inputs exceed defined number of shards')

    const input = new PassThrough()

    readable.on('data', (data: Buffer) => {
      input.pause()
      input.push(data)
    })

    readable.on('end', () => { input.end() })

    input.once('readable', () => {
      // console.log('shard is now readable, start to download')
      // Init exchange report
    })

    input.once('end', () => {
      const inputHash = ripemd160(this.hasher.digest())
      this.hasher = createHash('sha256')

      this.inputs.splice(this.inputs.indexOf(input), 1)

      if (Buffer.compare(inputHash, hash) !== 0) {
        // Send exchange report FAILED_INTEGRITY
        console.log('Expected hash: %s, actual: %s', inputHash.toString('hex'), hash.toString('hex'))
        this.emit('error', Error('Shard failed integrity check'))
      } else {
        console.log('Shard %s OK', inputHash.toString('hex'))
        // Send successful SHARD_DOWNLOADED
      }

      this.emit('drain', input)
    })

    readable.on('error', (err) => {
      // Send failure exchange report DOWNLOAD_EERROR
      this.emit('error', err)
    })

    this.added++
    this.inputs.push(input)
    this.emit('sourceAdded')

    return this
  }

}

export default FileMuxer