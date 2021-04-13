import { expect } from 'chai'
import GaloisField from '../src/lib/reed-solomon/GaloisField'


const gf = new GaloisField()

describe('Galois Field Basic Operations', () => {
  it('Product on Galois field', () => {
    // 2x2 Matrices
    const a = new Uint8Array([1, 2, 3, 4])
    const b = new Uint8Array([5, 6, 7, 8])
    const expected = new Uint8Array([11, 22, 19, 42])
    const res = gf.dotProduct(a,2,2,b,2,2)

    expect(res).to.eql(expected)
  })

  it('Linear combination of two arrays dst and src and save result to dst', () => {
    const c = 25
    const size = 4
    const src = new Uint8Array([0, 1, 2, 3])
    const dst = new Uint8Array(src.length)
    const expected = new Uint8Array([0, 25, 50, 43])
    gf.addMul2(dst, src, c, size, size, size, 0, 0)

    expect(dst).to.eql(expected)
  })
})

describe("Galois Field, Matrix Inversion", () => {

  const c = 25
  const size = 4

  it("Performs a linear combination of two rows of a matrix", () => {
    const input = new Uint8Array([0, 1, 2, 3, 0, 0 ,0 ,0])
    const res = new Uint8Array(2 * input.length)
    res.set(input)
    gf.addMul(input, c, size, size, 0)
    expect(input).to.eql(new Uint8Array([0, 1, 2, 3, 0, 25, 50, 43]))
  })

  it("Inverts a Matrix. Gauss-Jordan.", () => {

    // Normal Case 3x3 Matrix
    const A = new Uint8Array([56, 23, 98, 3, 100, 200, 45, 201, 123])
    const A_inverted = new Uint8Array([175, 133, 33, 130, 13, 245, 112, 35, 126])
    gf.invertMat(A, 3)
    expect(A).to.eql(A_inverted)

    // Normal Case 5x5 Matrix
    const B = new Uint8Array([
                              1, 0, 0, 0, 0,
                              0, 1, 0, 0, 0,
                              0, 0, 0, 1, 0,
                              0, 0, 0, 0, 1,
                              7, 7, 6, 6, 1
                            ])
    const B_inverted = new Uint8Array([
                              1, 0, 0, 0, 0,
                              0, 1, 0, 0, 0,
                              123, 123, 1, 122, 122,
                              0, 0, 1, 0, 0,
                              0, 0, 0, 1, 0
                            ])

    gf.invertMat(B,5)
    expect(B).to.eql(B_inverted)

    // TODO test Singular Matrices

  })
})

