"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subMatrix = exports.memcmp = exports.swap = void 0;
/**
 * Swap two elements of an array
 *
 * @param {*} array
 * @param {*} a_index
 * @param {*} b_index
 */
function swap(array, a_index, b_index) {
    var tmp = array[a_index];
    array[a_index] = array[b_index];
    array[b_index] = tmp;
}
exports.swap = swap;
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
function memcmp(a, startA, endA, b, startB, endB) {
    var elementsOfA = endA - startA + 1;
    var elementsOfB = endB - startB + 1;
    var elementsToCompare = (elementsOfA <= elementsOfB) ? elementsOfA : elementsOfB;
    for (var offset = 0; offset < elementsToCompare; offset++) {
        var A = a[startA + offset];
        var B = b[startB + offset];
        if (A < B)
            return -1;
        else if (A > B)
            return 1;
    }
    return 0;
}
exports.memcmp = memcmp;
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
function subMatrix(matrix, rmin, cmin, rmax, cmax, nrows, ncols) {
    var new_m = new Uint8Array((rmax - rmin) * (cmax - cmin));
    var ptr = 0;
    for (var i = rmin; i < rmax; i++) {
        for (var j = cmin; j < cmax; j++) {
            new_m[ptr++] = matrix[i * ncols + j];
        }
    }
    return new_m;
}
exports.subMatrix = subMatrix;
