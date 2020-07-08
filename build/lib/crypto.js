"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ripemd160 = exports.sha512 = exports.sha256 = void 0;
var crypto_1 = __importDefault(require("crypto"));
function sha256(input) {
    return crypto_1.default.createHash('sha256').update(input).digest();
}
exports.sha256 = sha256;
function sha512(input) {
    return crypto_1.default.createHash('sha512').update(input).digest();
}
exports.sha512 = sha512;
function ripemd160(input) {
    return crypto_1.default.createHash('ripemd160').update(input).digest();
}
exports.ripemd160 = ripemd160;
