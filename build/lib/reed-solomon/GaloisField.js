"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ArrayOperators_1 = require("./ArrayOperators");
var ReedSolomonError_1 = __importDefault(require("./ReedSolomonError"));
var GaloisField = /** @class */ (function () {
    function GaloisField() {
        this.GF_BITS = 8;
        this.GF_SIZE = ((1 << this.GF_BITS) - 1); // 2 ** GF_BITS - 1
        this.gf_mul_table = new Uint8Array((this.GF_SIZE + 1) * (this.GF_SIZE + 1));
        this.Pp = this.getPrimitivePolinomial(); // set primitive polinomial
        this.gf_exp = new Uint8Array(2 * this.GF_SIZE);
        this.gf_log = new Array(this.GF_SIZE + 1);
        this.inverse = new Uint8Array(this.GF_SIZE + 1);
        this.generateGaloisField();
        this.init_mul_table();
    }
    GaloisField.prototype.init_mul_table = function () {
        for (var i = 0; i <= this.GF_SIZE; i++) {
            for (var j = 0; j <= this.GF_SIZE; j++) {
                this.gf_mul_table[(i << 8) + j] = this.gf_exp[this.modnn(this.gf_log[i] + this.gf_log[j])];
            }
        }
        for (var j = 0; j < this.GF_SIZE + 1; j++) {
            this.gf_mul_table[j] = this.gf_mul_table[j << 8] = 0;
        }
    };
    /*Modulus*/
    GaloisField.prototype.modnn = function (x) {
        while (x >= this.GF_SIZE) {
            x -= this.GF_SIZE;
            x = (x >> this.GF_SIZE) + (x & this.GF_SIZE);
        }
        return x;
    };
    GaloisField.prototype.generateGaloisField = function () {
        var mask = 1;
        for (var i = 0; i < this.GF_BITS; i++, mask <<= 1) {
            this.gf_exp[i] = mask;
            this.gf_log[this.gf_exp[i]] = i;
            // If use generator === 2
            if (this.Pp && this.Pp.charAt(i) === '1') {
                this.gf_exp[this.GF_BITS] = this.gf_exp[this.GF_BITS] ^ mask;
            }
        }
        /* Compute gf_exp inverse */
        this.gf_log[this.gf_exp[this.GF_BITS]] = this.GF_BITS;
        mask = 1 << (this.GF_BITS - 1);
        for (var i = this.GF_BITS + 1; i < this.GF_SIZE; i++) {
            if (this.gf_exp[i - 1] >= mask) {
                this.gf_exp[i] = this.gf_exp[this.GF_BITS] ^ ((this.gf_exp[i - 1] ^ mask) << 1);
            }
            else {
                this.gf_exp[i] = this.gf_exp[i - 1] << 1;
            }
            this.gf_log[this.gf_exp[i]] = i;
        }
        // log(0) case
        this.gf_log[0] = this.GF_SIZE;
        // extend gf_exp for fast multiplication
        for (var i = 0; i < this.GF_SIZE; i++) {
            this.gf_exp[i + this.GF_SIZE] = this.gf_exp[i];
        }
        // inverse
        this.inverse[0] = 0;
        this.inverse[1] = 1;
        for (var i = 2; i < this.GF_SIZE; i++) {
            this.inverse[i] = this.gf_exp[this.GF_SIZE - this.gf_log[i]];
        }
    };
    GaloisField.prototype.getPrimitivePolinomial = function () {
        var primitivePolinomials = [
            null,
            null,
            "111",
            "1101",
            "11001",
            "101001",
            "1100001",
            "10010001",
            "101110001",
            "1000100001",
            "10010000001",
            "101000000001",
            "1100101000001",
            "11011000000001",
            "110000100010001",
            "1100000000000001",
            "11010000000010001" /* 16   1+x+x^3+x^12+x^16   */
        ];
        return primitivePolinomials[this.GF_BITS];
    };
    /* Exponential of the GF y = a**n*/
    GaloisField.prototype.galExp = function (base, exponent) {
        if (exponent == 0)
            return 1;
        if (base == 0)
            return 0;
        var logBase = this.gf_log[base];
        var logResult = logBase * exponent;
        while (logResult <= 255)
            logResult -= 255;
        return this.gf_exp[logResult];
    };
    GaloisField.prototype.galMultiply = function (a, b) {
        return this.gf_mul_table[(a << 8) + b];
    };
    /**
    * Computes vandermonde Matrix
    *
    * @param {number} nrows Number of shards
    * @param {number} ncols Number of data shards
    * @return {*}  {Uint8Array}
    */
    GaloisField.prototype.vandermonde = function (nrows, ncols) {
        var matrix = new Uint8Array(nrows * ncols);
        var ptr = 0;
        for (var row = 0; row < nrows; row++) {
            for (var col = 0; col < ncols; col++) {
                matrix[ptr++] = this.galExp(row, col);
            }
        }
        return matrix;
    };
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
    GaloisField.prototype.dotProduct = function (a, ar, ac, b, br, bc, initA, initB) {
        if (initA === void 0) { initA = 0; }
        if (initB === void 0) { initB = 0; }
        // Check conditions for multiplication
        if (ac != br)
            throw new ReedSolomonError_1.default('Columns of A should be equal to rows in B for dot product.');
        else {
            var ptr = 0;
            var y = new Uint8Array(ar * bc);
            for (var r = 0; r < ar; r++) {
                for (var c = initB; c < bc; c++) {
                    var tg = 0;
                    for (var i = initA; i < ac; i++) {
                        tg ^= this.galMultiply(a[r * ac + i], b[i * bc + c]);
                    }
                    y[ptr++] = tg;
                }
            }
            return y;
        }
    };
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
    GaloisField.prototype.addMul2 = function (dst, src, c, srcMax, initPointerDst, initPointerSrc) {
        if (initPointerDst === void 0) { initPointerDst = 0; }
        if (initPointerSrc === void 0) { initPointerSrc = 0; }
        var lowerMax = srcMax; //Math.min(dstMax, srcMax)
        if (c != 0) {
            // TODO: Check when we past the max -> Is it really needed? -> Arrays init to 0.
            for (; initPointerDst < lowerMax; initPointerDst++, initPointerSrc++) {
                dst[initPointerDst] = dst[initPointerDst] ^ this.gf_mul_table[(c << 8) + src[initPointerSrc]];
            }
        }
    };
    GaloisField.prototype.addMul = function (matrix, c, sz, pointerRowDst, pointerRowSrc) {
        var lim = pointerRowDst + sz;
        if (c != 0) {
            // TODO: Check when we past the max -> Is it really needed? -> Arrays init to 0.
            for (; pointerRowDst < lim; pointerRowDst++, pointerRowSrc++) {
                matrix[pointerRowDst] ^= this.gf_mul_table[(c << 8) + matrix[pointerRowSrc]];
            }
        }
    };
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
    GaloisField.prototype.mul = function (dst, src, c, sz, dstMax, srcMax, initPointerDst, initPointerSrc) {
        var lowerMax = Math.min(dstMax, srcMax);
        if (c != 0) {
            // TODO: Check when we past the max -> Is it really needed? -> Arrays init to 0.
            for (; initPointerDst < lowerMax; initPointerDst++, initPointerSrc++) {
                dst[initPointerDst] = this.gf_mul_table[(c << 8) + src[initPointerSrc]];
            }
        }
    };
    GaloisField.prototype.invertMat = function (src, k) {
        var _this = this;
        // Coordenates of pivots
        var indxc = new Uint8Array(k), indxr = new Uint8Array(k);
        var ipiv = new Uint8Array(k); // Elements already used as pivots
        var id_row = new Uint8Array(k);
        var foundPivot = function (irow, icol, col) {
            ipiv[icol] += 1;
            // SWAP Rows irow and icol
            if (irow != icol) {
                for (var ix = 0; ix < k; ix++) {
                    ArrayOperators_1.swap(src, irow * k + ix, icol * k + ix);
                }
            }
            indxr[col] = irow;
            indxc[col] = icol;
            var pivot_row_index = icol * k;
            var c = src[pivot_row_index + icol];
            if (c == 0)
                throw new ReedSolomonError_1.default('Singular Matrix 2');
            if (c != 1) {
                c = _this.inverse[c];
                src[pivot_row_index + icol] = 1;
                for (var ix = 0; ix < k; ix++) {
                    src[pivot_row_index + ix] = _this.gf_mul_table[(c << 8) + src[pivot_row_index + ix]];
                }
            }
            // Remove multiples of the selected row
            id_row[icol] = 1;
            if (ArrayOperators_1.memcmp(src, pivot_row_index, pivot_row_index + k, id_row, 0, k) != 0) {
                for (var p = 0, ix = 0; ix < k; ix++, p += k) {
                    if (ix != icol) {
                        c = src[p + icol];
                        src[p + icol] = 0;
                        _this.addMul(src, c, k, p, pivot_row_index);
                    }
                }
            }
            id_row[icol] = 0;
        }; /* done all columns ???  */
        loopColumns: for (var col = 0; col < k; col++) {
            var irow = -1, icol = -1;
            if (ipiv[col] != 1 && src[col * k + col] != 0) {
                irow = col;
                icol = col;
                foundPivot(irow, icol, col);
                continue;
            }
            loopRows: for (var row = 0; row < k; row++) {
                if (ipiv[row] != 1) {
                    for (var ix = 0; ix < k; ix++) {
                        if (ipiv[ix] == 0) {
                            if (src[row * k + ix] != 0) {
                                irow = row;
                                icol = ix;
                                foundPivot(irow, icol, col);
                                break loopRows; //continue
                            }
                        }
                        else if (ipiv[ix] > 1) {
                            // FAIL
                            throw new ReedSolomonError_1.default('Singular Matrix');
                        }
                    }
                }
            }
            if (icol == -1) {
                throw new ReedSolomonError_1.default('Pivot not found');
            }
        } /* done all columns */
        for (var col = k - 1; col >= 0; col--) {
            if (indxr[col] < 0 || indxr[col] >= k) {
                // Error ?
            }
            else if (indxc[col] < 0 || indxc[col] >= k) {
                // Error ?
            }
            else {
                if (indxr[col] != indxc[col]) {
                    for (var row = 0; row < k; row++) {
                        ArrayOperators_1.swap(src, row * k + indxr[col], row * k + indxc[col]);
                    }
                }
            }
        }
    };
    return GaloisField;
}());
exports.default = GaloisField;
