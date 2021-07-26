"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drainStream = void 0;
function drainStream(stream) {
    return new Promise(function (r) {
        stream.on('drain', function () {
            console.log('STREAM DRAINED');
            r(null);
        });
    });
}
exports.drainStream = drainStream;
