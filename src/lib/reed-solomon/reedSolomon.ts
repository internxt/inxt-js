interface RS {
  data_shards: number,
  parity_shards: number,
  shards: number,
  m: Uint8Array,
  parity: Uint8Array
}
const GF_BITS = 8
const GF_SIZE = ((1 << GF_BITS) - 1) // 2 ** GF_BITS - 1

const gf_exp = new Uint8Array(2 * GF_SIZE)
const gf_log = new Uint8Array(GF_SIZE + 1)
const inverse = new Uint8Array(GF_SIZE + 1)

const gf_mul_table = new Uint8Array(Math.pow(GF_SIZE + 1, 2))

/**
 * compareTo of two arays
 *
 * @param {Uint8Array} a
 * @param {number} startA
 * @param {number} endA
 * @param {Uint8Array} b
 * @param {number} startB
 * @param {number} endB
 * @return {number} 1 if a>b, -1 if a<b, 0 otherwise
 */
function memcmp(a: Uint8Array, startA:number, endA:number, b:Uint8Array, startB:number, endB:number): number {
  const elementsOfA = endA - startA + 1
  const elementsOfB = endB - startB + 1
  const elementsToCompare = (elementsOfA <= elementsOfB) ? elementsOfA : elementsOfB
  for(let offset=0; offset<elementsToCompare; offset++) {
    const A = a[startA + offset]
    const B = b[startB + offset]
    if( A<B ) return -1
    else if(A>B) return 1
  }
  return 0
}
function GF_ADDMULC(dst: Uint8Array, pos: number, x: number, c:number) {
  dst[pos] ^= gf_mul_table[(c << 8) + x]
}

function GF_MULC(dst: Uint8Array, pos:number, x: number, c: number) {
  dst[pos] = gf_mul_table[(c << 8) + x]
}
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

export function generate_gf(): void {
  let mask = 1
  const Pp:string = primitivePolynomial[GF_BITS]

  // Compute gf_exp
  for(let i = 0; i < GF_BITS; i++, mask <<= 1) {
    gf_exp[i] = mask
    gf_log[gf_exp[i]] = i

    if( Pp.charAt(i) === '1') {
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

/**
 * addmul() computes dst[] = dst[] + c * src[]
 * C != 0
 *
 * @param {Uint8Array} dst
 * @param {Uint8Array} src
 * @param {number} c
 * @return {*}
 */
function addmul(dst1: Uint8Array, src1: Uint8Array, c:number, sz: number, dst_max: number, src_max: number, iRow:number, dataShards: number) {
  let dst = iRow, src = iRow*dataShards+c
  const lim: number = dst_max < src_max ? dst_max : src_max;

  for(let pos=0; dst <= lim; dst++, src++, pos++) {
    if(pos < src_max && pos < dst_max) {
      // PERFORM MULTIPLICATION GF dst*, src*
      GF_ADDMULC(dst1, dst, src1[src], c)
    }
    else if(pos < dst_max) {
      /* assume zero when past the max */
      // ADD MUL dst*, 0
      GF_ADDMULC(dst1, dst, 0, c)
    }
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

/**
 * Set reed solomon object data
 *
 * @param {number} data_shards
 * @param {number} parity_shards
 * @return {RS}
 */
function reed_solomon_new(data_shards: number, parity_shards: number): RS {

  const total_number_of_shards = data_shards + parity_shards

  const vm = vandermonde(total_number_of_shards, data_shards)
  const top = sub_matrix(vm, 0, 0, data_shards, data_shards, total_number_of_shards, data_shards)

  // A matrix can be singular -> Control possible errors here
  const err = invert_mat(top, data_shards) // data_shards are the size of the matrix, take care of singular

  const m = multiply1(vm, total_number_of_shards, data_shards, top, data_shards, data_shards)
  const parity = sub_matrix(m, data_shards, 0, total_number_of_shards, data_shards, total_number_of_shards, data_shards)

  const rs: RS = {
    data_shards: data_shards,
    parity_shards: parity_shards,
    shards: (data_shards + parity_shards),
    m: m,
    parity: parity
  }

  return rs

}

/**
 * Reed Solomon Encoder
 *
 * @param {RS} rs
 * @param {Array<Uint8Array>} data_blocks
 * @param {Array<Uint8Array>} fec_blocks
 * @param {number} block_size
 * @param {number} total_bytes
 */
function reed_solomon_encode(rs: RS, data_blocks: Array<Uint8Array>, fec_blocks: Array<Uint8Array>, block_size: number, total_bytes: number) {
  const data_blocks_max = new Uint8Array(rs.data_shards)
  const fec_blocks_max = (new Uint8Array(rs.parity_shards))


  // Calculate the max for each shard based on the total bytes
  // the last shard may be less than the shard size

  for(let c=0; c < rs.data_shards; c++) {
    let bytes_remaining = total_bytes - c * block_size
    let max = block_size
    if(bytes_remaining < block_size) {
      max = bytes_remaining
    }
    data_blocks_max[c] = max
  }

  // parity shards will be of block size
  for(let c=0; c < rs.parity_shards; c++) {
    fec_blocks_max[c] = block_size
  }

  code_some_shards(rs.parity, data_blocks, fec_blocks, rs.data_shards, rs.parity_shards, block_size, data_blocks_max, fec_blocks_max)
}

  return rs

}

/**
 *
 *
 * @param {Uint8Array} matrixRows
 * @param {Array<Uint8Array>} inputs
 * @param {Array<Uint8Array>} outputs
 * @param {number} dataShards
 * @param {number} outputCount
 * @param {number} byteCount
 * @param {Uint8Array} inputsMax
 * @param {Uint8Array} outputsMax
 */
function code_some_shards(matrixRows: Uint8Array, inputs: Array<Uint8Array>, outputs: Array<Uint8Array>, dataShards: number, outputCount: number, byteCount: number, inputsMax: Uint8Array, outputsMax: Uint8Array) {
  for(let c = 0; c< dataShards; c++) {
    for(let iRow = 0; iRow < outputCount; iRow) {
      if(c != 0) {
        addmul(outputs[iRow], inputs[c], matrixRows[iRow * dataShards + c], byteCount, outputsMax[iRow], inputsMax[c])
      }
      else {
        mul(outputs[iRow], inputs[c], matrixRows[iRow * dataShards + c], byteCount, outputsMax[iRow], inputsMax[c])
      }
    }
  }
}