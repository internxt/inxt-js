export default class GaloisField {
    GF_BITS: number;
    GF_SIZE: number;
    gf_mul_table: Uint8Array;
    Pp: string | null;
    gf_exp: Uint8Array;
    gf_log: any[];
    inverse: Uint8Array;
    constructor();
    init_mul_table(): void;
    modnn(x: number): number;
    generateGaloisField(): void;
    getPrimitivePolinomial(): string | null;
    galExp(base: number, exponent: number): number;
    galMultiply(a: number, b: number): number;
    /**
    * Computes vandermonde Matrix
    *
    * @param {number} nrows Number of shards
    * @param {number} ncols Number of data shards
    * @return {*}  {Uint8Array}
    */
    vandermonde(nrows: number, ncols: number): Uint8Array;
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
    dotProduct(a: Uint8Array, ar: number, ac: number, b: Uint8Array, br: number, bc: number, initA?: number, initB?: number): Uint8Array;
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
    addMul2(dst: Uint8Array, src: Uint8Array, c: number, srcMax: number, initPointerDst?: number, initPointerSrc?: number): void;
    addMul(matrix: Uint8Array, c: number, sz: number, pointerRowDst: number, pointerRowSrc: number): void;
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
    mul(dst: Uint8Array, src: Uint8Array, c: number, sz: number, dstMax: number, srcMax: number, initPointerDst: number, initPointerSrc: number): void;
    invertMat(src: Uint8Array, k: number): void;
}
