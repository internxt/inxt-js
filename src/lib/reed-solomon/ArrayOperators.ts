/**
 * Swap two elements of an array
 *
 * @param {*} array
 * @param {*} a_index
 * @param {*} b_index
 */
export function swap(array: Uint8Array, a_index: number, b_index: number): void {
  const tmp = array[a_index]
  array[a_index] = array[b_index]
  array[b_index] = tmp
}

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
export function memcmp(a: Uint8Array, startA: number, endA: number, b: Uint8Array, startB: number, endB: number): number {
  const elementsOfA = endA - startA + 1
  const elementsOfB = endB - startB + 1
  const elementsToCompare = (elementsOfA <= elementsOfB) ? elementsOfA : elementsOfB
  for (let offset = 0; offset < elementsToCompare; offset++) {
    const A = a[startA + offset]
    const B = b[startB + offset]
    if (A < B) return -1
    else if (A > B) return 1
  }
  return 0
}

/**
 * Compute the submatrix from an Array that represents a matrix
 *
 * @param {Uint8Array} matrix
 * @param {number} rmin
 * @param {number} cmin
 * @param {number} rmax
 * @param {number} cmax
 * @param {number} nrows
 * @param {number} ncols
 * @return {*}
 */
export function subMatrix(matrix: Uint8Array, rmin: number, cmin: number, rmax: number, cmax: number, nrows: number, ncols: number): Uint8Array {
  const new_m = new Uint8Array((rmax - rmin) * (cmax-cmin))
  let ptr = 0
  for(let i = rmin; i < rmax; i++) {
    for(let j = cmin; j < cmax; j++) {
      new_m[ptr++] = matrix[i*ncols + j]
    }
  }
  return new_m
}