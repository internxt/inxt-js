import { expect } from 'chai'
import ReedSolomon from '../src/lib/reed-solomon/ReedSolomon'

describe('Encoder', () => {
  it('Encodes a string', () => {
    //const buf = Buffer.from("hello world hello world ")
    const text = "hello world hello world "
    // const output = 256 chars?
    const blockSize = 2
    const nrDataBlocks = text.length / blockSize
    const dataBlocks = new Uint8Array(128)
    const fecBlocks = new Uint8Array(128)
    const nrFecBlocks = 6
    const RS = new ReedSolomon(nrDataBlocks, nrFecBlocks)
    


  })
})