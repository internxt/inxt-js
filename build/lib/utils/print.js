"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = void 0;
var log = function (color, msg) { return console.log(color + '%s\x1b[0m', msg); };
var red = function (msg) { return log('\x1b[41m', msg); };
var green = function (msg) { return log('\x1b[32m', msg); };
var blue = function (msg) { return log('\x1b[44m', msg); };
exports.print = { red: red, green: green, blue: blue };
