import { expect } from 'chai'
import {swap, memcmp, subMatrix } from '../src/lib/reed-solomon/ArrayOperators'

describe('Reed Solomon helper functions', () => {
  it('Swaps two elements of an array', () => {
    const a = new Uint8Array([1,2,3,4,5,6,7,8,9,10])
    const ae = new Uint8Array([1,2,3,7,5,6,4,8,9,10])

    swap(a,4-1,7-1)

    expect(a).to.eql(ae)
  })

  it('CompareTo of two arrays', () => {
    // TODO
  })
})