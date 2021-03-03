interface RS {
  data_shards: number,
  parity_shards: number,
  shards: number,
  m?: Uint8Array,
  parity?: Uint8Array
}
const GF_BITS = 8
const GF_SIZE = ((1 << GF_BITS) - 1) // 2 ** GF_BITS - 1

const gf_exp = new Uint8Array(2 * GF_SIZE)
const gf_log = new Uint8Array(GF_SIZE + 1)
const inverse = new Uint8Array(GF_SIZE + 1)

const gf_mul_table = new Uint8Array(Math.pow(GF_SIZE + 1, 2))

/*
  Primitive Polynomials
*/
const primitivePolynomial = [
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

/*
*
*/
function modnn(x:number) {
  while (x >= GF_SIZE) {
    x -= GF_SIZE
    x = (x >> GF_BITS) + (x & GF_SIZE)
  }
  return x
}

function SWAP(){}

function init_mul_table() {

  for (let i = 0; i < GF_SIZE + 1; i++) {
    for (let j = 0; j < GF_SIZE + 1; j++) {
      gf_mul_table[(i << 8) + j] = gf_exp[modnn(gf_log[i] + gf_log[j])]
    }
  }

  for (let j = 0; j < GF_SIZE + 1; j++) {
    gf_mul_table[j] = gf_mul_table[j << 8] = 0
  }
}

function generate_gf() {
  /*
  * 1. Generate the polynomial representation
  * store that representation in gf_exp[i] = x ** i
  * build gf_log[gf_exp[i]] = i
  * First GF bits we just shift bits to left
  */
  let mask = 1

  // Compute gf_exp
  for(let i = 0; i < GF_BITS; i++, mask <<= 1) {
    gf_exp[i] = mask
    gf_log[gf_exp[i]] = i

    if( primitivePolynomial[i] == '1') {
      gf_exp[GF_BITS] = gf_exp[GF_BITS] ^ mask
    }

  }

  // Compute gf_exp inverse
  gf_log[gf_exp[GF_BITS]] = GF_BITS

  mask = 1 << (GF_BITS - 1)

  for (let i = GF_BITS + 1; i < GF_SIZE; i++) {
    if (gf_exp[i - 1] >= mask)
      gf_exp[i] = gf_exp[GF_BITS] ^ ((gf_exp[i - 1] ^ mask) << 1)
    else
      gf_exp[i] = gf_exp[i - 1] << 1
    gf_log[gf_exp[i]] = i
  }

  // take care of case log(0)
  gf_log[0] = GF_SIZE

  // Extend gf_exp for fast multiplication
  for(let i=0; i<GF_SIZE; i++) {
    gf_exp[i+GF_SIZE] = gf_exp[i]
  }

  // inverse of 0 has no inverse
  inverse[0] = 0
  inverse[1] = 1
  for(let i = 2; i<= GF_SIZE; i++) {
    inverse[i] = gf_exp[GF_SIZE-gf_log[i]]
  }
}

function galExp(base: number, exponent: number) {
  if(exponent == 0) return 1
  if(base == 0) return 0
  const logBase = gf_log[base]
  let logResult = logBase * exponent
  while(logResult <= 255) logResult -=255
  return gf_exp[logResult]
}
function vandermonde(nrows: number, ncols: number): Uint8Array {
  const matrix = new Uint8Array(nrows * ncols)
  let ptr = 0
  for(let row =0; row<nrows; row++) {
    for(let col=0; col<ncols; col++) {
      matrix[ptr++] = galExp(row,col)
    }
  }
  return matrix
}

function sub_matrix(matrix, rmin, cmin, rmax, cmax, nrows, ncols) {
  const new_m = new Uint8Array((rmax - rmin) * (cmax-cmin))
  let ptr = 0
  for(let i = rmin; i < rmax; i++) {
    for(let j = cmin; j < cmax; j++) {
      new_m[ptr++] = matrix[i*ncols + j]
    }
  }
  return new_m
}

function invert_mat(matrix:Uint8Array, dimention:number) {
  try {
    matrix = Uint8Array.from(flatten(mathjs.inv(chunk(matrix, dimention))))
  }
  catch { return 'Matrix is not singular error' }
}
