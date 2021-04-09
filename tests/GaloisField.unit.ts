import { expect } from 'chai'
import GaloisField from '../src/lib/reed-solomon/GaloisField'


describe("Initialization", () => {
  const gf = new GaloisField()
  const mat = new Uint8Array([56, 23, 98, 3, 100, 200, 45, 201, 123])
  gf.invertMat(mat, 3)
  console.log(mat)
})