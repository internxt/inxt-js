"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drainStream = void 0;
function drainStream(stream) {
    return new Promise(function (r) { return stream.on('drain', r); });
}
exports.drainStream = drainStream;
