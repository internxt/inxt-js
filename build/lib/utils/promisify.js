"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promisifyStream = void 0;
function promisifyStream(stream) {
    return new Promise(function (res, rej) {
        stream.on('error', rej);
        stream.on('end', res);
    });
}
exports.promisifyStream = promisifyStream;
