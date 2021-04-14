import { swap, memcmp, subMatrix } from './ArrayOperators'
import ReedSolomonError from './ReedSolomonError'

export default class GaloisField {
  GF_BITS = 8
  GF_SIZE = ((1 << this.GF_BITS) - 1) // 2 ** GF_BITS - 1
  gf_mul_table = new Uint8Array((this.GF_SIZE + 1) * (this.GF_SIZE + 1))
  Pp = this.getPrimitivePolinomial() // set primitive polinomial
  gf_exp = new Uint8Array(2 * this.GF_SIZE)
  gf_log = new Array(this.GF_SIZE + 1)
  inverse = new Uint8Array(this.GF_SIZE + 1)


  constructor() {
    this.generateGaloisField()
    this.init_mul_table()
  }

  init_mul_table(): void{
    for (let i = 0; i <= this.GF_SIZE; i++) {
      for (let j = 0; j <= this.GF_SIZE; j++) {
        this.gf_mul_table[(i << 8) + j] = this.gf_exp[this.modnn(this.gf_log[i] + this.gf_log[j])]
      }
    }
    for (let j = 0; j < this.GF_SIZE + 1; j++) {
      this.gf_mul_table[j] = this.gf_mul_table[j << 8] = 0
    }
  }

  /*Modulus*/
  modnn(x: number): number {
    while (x >= this.GF_SIZE) {
      x -= this.GF_SIZE
      x = (x >> this.GF_SIZE) + (x & this.GF_SIZE)
    }
    return x
  }

  generateGaloisField(): void {
    let mask = 1

    for(let i=0; i < this.GF_BITS; i++, mask <<= 1) {
      this.gf_exp[i] = mask
      this.gf_log[this.gf_exp[i]] = i
      // If use generator === 2
      if(this.Pp && this.Pp.charAt(i) === '1') {
        this.gf_exp[this.GF_BITS] = this.gf_exp[this.GF_BITS] ^ mask
      }
    }
    /* Compute gf_exp inverse */
    this.gf_log[this.gf_exp[this.GF_BITS]] = this.GF_BITS
    mask = 1 << (this.GF_BITS - 1)

    for(let i = this.GF_BITS + 1; i < this.GF_SIZE; i++) {
      if(this.gf_exp[i-1] >= mask) {
        this.gf_exp[i] = this.gf_exp[this.GF_BITS] ^((this.gf_exp[i - 1] ^ mask) << 1)
      }
      else {
        this.gf_exp[i] = this.gf_exp[i - 1] << 1
      }
      this.gf_log[this.gf_exp[i]] = i
    }

    // log(0) case
    this.gf_log[0] = this.GF_SIZE

    // extend gf_exp for fast multiplication
    for(let i=0; i<this.GF_SIZE; i++) {
      this.gf_exp[i+this.GF_SIZE] = this.gf_exp[i]
    }

    // inverse
    this.inverse[0] = 0
    this.inverse[1] = 1

    for(let i=2; i<this.GF_SIZE; i++) {
      this.inverse[i] = this.gf_exp[this.GF_SIZE - this.gf_log[i]]
    }
  }

  getPrimitivePolinomial(): string | null {
    const primitivePolinomials = [
      null,            /* no code */
      null,            /* no code */
      "111",          /*  2   1+x+x^2         */
      "1101",         /*  3   1+x+x^3         */
      "11001",            /*  4   1+x+x^4         */
      "101001",           /*  5   1+x^2+x^5       */
      "1100001",          /*  6   1+x+x^6         */
      "10010001",         /*  7   1 + x^3 + x^7       */
      "101110001",        /*  8   1+x^2+x^3+x^4+x^8   */
      "1000100001",       /*  9   1+x^4+x^9       */
      "10010000001",      /* 10   1+x^3+x^10      */
      "101000000001",     /* 11   1+x^2+x^11      */
      "1100101000001",        /* 12   1+x+x^4+x^6+x^12    */
      "11011000000001",       /* 13   1+x+x^3+x^4+x^13    */
      "110000100010001",      /* 14   1+x+x^6+x^10+x^14   */
      "1100000000000001",     /* 15   1+x+x^15        */
      "11010000000010001"     /* 16   1+x+x^3+x^12+x^16   */
    ]
    return primitivePolinomials[this.GF_BITS]
  }

  /* Exponential of the GF y = a**n*/
  galExp(base: number, exponent: number): number {
    if (exponent == 0) return 1
    if (base == 0) return 0
    const logBase = this.gf_log[base]
    let logResult = logBase * exponent
    while (logResult <= 255) logResult -= 255
    return this.gf_exp[logResult]
  }

  galMultiply(a: number, b:number): number {
    return this.gf_mul_table[(a << 8) + b]
  }

  /**
  * Computes vandermonde Matrix
  *
  * @param {number} nrows Number of shards
  * @param {number} ncols Number of data shards
  * @return {*}  {Uint8Array}
  */
  vandermonde(nrows: number, ncols: number): Uint8Array {
    const matrix = new Uint8Array(nrows * ncols)
    let ptr = 0
    for (let row = 0; row < nrows; row++) {
      for (let col = 0; col < ncols; col++) {
        matrix[ptr++] = this.galExp(row, col)
      }
    }
    return matrix
  }


  /**
   * y = a * b (* is dot product)
   *
   * @param {Uint8Array} a
   * @param {number} ar
   * @param {number} ac
   * @param {Uint8Array} b
   * @param {number} br
   * @param {number} bc
   * @return {*}  {Uint8Array}
   * @memberof GaloisField
   */
  dotProduct(a: Uint8Array, ar: number, ac: number, b: Uint8Array, br: number, bc: number, initA = 0, initB = 0): Uint8Array {

    // Check conditions for multiplication
    if(ac != br ) throw new ReedSolomonError('Columns of A should be equal to rows in B for dot product.')
    else {
      let ptr = 0
      const y = new Uint8Array(ar * bc)
      for(let r = 0; r < ar; r++) {
        for(let c = initB; c < bc; c++) {
          let tg = 0
          for(let i=initA; i < ac; i++) {
            tg ^= this.galMultiply(a[r*ac+i], b[i*bc+c])
          }
          y[ptr++] = tg
        }
      }
      return y
    }
  }



  /**
   *
   *
   * @param {Uint8Array} dst
   * @param {Uint8Array} src
   * @param {number} c
   * @param {number} sz
   * @param {number} dstMax
   * @param {number} srcMax
   * @param {number} initPointerDst
   * @param {number} initPointerSrc
   * @memberof GaloisField
   */
  addMul2(dst: Uint8Array, src: Uint8Array, c: number, sz: number, dstMax: number, srcMax: number, initPointerDst: number, initPointerSrc: number): void {
    const lowerMax = srcMax//Math.min(dstMax, srcMax)
    if(c != 0) {
      // TODO: Check when we past the max -> Is it really needed? -> Arrays init to 0.
      for (; initPointerDst < lowerMax; initPointerDst++, initPointerSrc++) {
        dst[initPointerDst] = dst[initPointerDst] ^ this.gf_mul_table[(c << 8) + src[initPointerSrc]]
      }
    }
  }

  addMul(matrix: Uint8Array, c: number, sz: number, pointerRowDst: number, pointerRowSrc: number): void {
    const lim = pointerRowDst + sz
    if (c != 0) {
      // TODO: Check when we past the max -> Is it really needed? -> Arrays init to 0.
      for (; pointerRowDst < lim; pointerRowDst++, pointerRowSrc++) {
        matrix[pointerRowDst] ^= this.gf_mul_table[(c << 8) + matrix[pointerRowSrc]]
      }
    }
  }


  /**
   *
   *
   * @param {Uint8Array} dst
   * @param {Uint8Array} src
   * @param {number} c
   * @param {number} sz
   * @param {number} dstMax
   * @param {number} srcMax
   * @param {number} initPointerDst
   * @param {number} initPointerSrc
   * @memberof GaloisField
   */
  mul(dst: Uint8Array, src: Uint8Array, c: number, sz: number, dstMax: number, srcMax: number, initPointerDst: number, initPointerSrc: number): void {
    const lowerMax = Math.min(dstMax, srcMax)
    if (c != 0) {
      // TODO: Check when we past the max -> Is it really needed? -> Arrays init to 0.
      for (; initPointerDst < lowerMax; initPointerDst++, initPointerSrc++) {
        dst[initPointerDst] = this.gf_mul_table[(c << 8) + src[initPointerSrc]]
      }
    }
  }

  invertMat(src: Uint8Array, k: number): void {
    // Coordenates of pivots
    const indxc = new Uint8Array(k), indxr = new Uint8Array(k)
    const ipiv = new Uint8Array(k) // Elements already used as pivots
    const id_row = new Uint8Array(k)
    const foundPivot = (irow: number, icol: number, col: number) => {
      ipiv[icol] += 1
      // SWAP Rows irow and icol
      if(irow != icol){
        for(let ix=0; ix < k; ix++) {
          swap(src, irow*k + ix, icol*k + ix)
        }
      }

      indxr[col] = irow
      indxc[col] = icol
      const pivot_row_index = icol * k
      let c = src[pivot_row_index + icol]
      if(c == 0) throw new ReedSolomonError('Singular Matrix 2')
      if (c != 1) {
        c = this.inverse[c]
        src[pivot_row_index + icol] = 1
        for(let ix=0; ix<k; ix++) {
          src[pivot_row_index + ix] = this.gf_mul_table[(c << 8) + src[pivot_row_index + ix]]
        }
      }

      // Remove multiples of the selected row
      id_row[icol] = 1
      if(memcmp(src, pivot_row_index, pivot_row_index + k, id_row, 0, k) != 0) {
        for(let p = 0, ix = 0; ix < k; ix++, p+= k) {
          if(ix != icol) {
            c = src[p + icol]
            src[p + icol] = 0
            this.addMul(src,c,k,p,pivot_row_index)
          }
        }
      }
      id_row[icol] = 0
    } /* done all columns ???  */

loopColumns:
    for(let col = 0; col < k; col++) {
      let irow = -1,  icol = -1
      if(ipiv[col] != 1 && src[col * k + col] != 0) {
        irow = col
        icol = col
        foundPivot(irow, icol, col)
        continue
      }
loopRows:
      for(let row = 0; row < k; row++) {
        if(ipiv[row] != 1) {
          for(let ix=0; ix < k; ix++) {
            if(ipiv[ix] == 0) {
              if(src[row*k + ix] != 0) {
                irow = row
                icol = ix
                foundPivot(irow,icol,col)
                break loopRows//continue
              }
            }
            else if(ipiv[ix] > 1) {
              // FAIL
              throw new ReedSolomonError('Singular Matrix')
            }
          }
        }
      }
      if(icol == -1) {
        throw new ReedSolomonError('Pivot not found')
      }
    } /* done all columns */

    for (let col=k-1; col >= 0; col-- ){
      if(indxr[col] < 0 || indxr[col] >= k) {
        // Error ?
      }
      else if(indxc[col] < 0 || indxc[col] >= k) {
        // Error ?
      }
      else {
        if(indxr[col] != indxc[col]) {
          for(let row=0; row<k; row++) {
            swap(src, row*k+indxr[col], row*k + indxc[col])
          }
        }
      }
    }

  }
}