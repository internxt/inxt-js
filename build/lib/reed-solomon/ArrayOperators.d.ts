/**
 * Swap two elements of an array
 *
 * @param {*} array
 * @param {*} a_index
 * @param {*} b_index
 */
export declare function swap(array: Uint8Array, a_index: number, b_index: number): void;
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
export declare function memcmp(a: Uint8Array, startA: number, endA: number, b: Uint8Array, startB: number, endB: number): number;
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
export declare function subMatrix(matrix: Uint8Array, rmin: number, cmin: number, rmax: number, cmax: number, nrows: number, ncols: number): Uint8Array;
