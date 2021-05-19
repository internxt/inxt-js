"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToStream = void 0;
var stream_1 = require("stream");
var DEFAULT_HIGHWATERMARK = 16384;
function bufferToStream(buf, chunkSize) {
    if (chunkSize === void 0) { chunkSize = DEFAULT_HIGHWATERMARK; }
    if (typeof buf === 'string') {
        buf = Buffer.from(buf, 'utf8');
    }
    if (!Buffer.isBuffer(buf)) {
        throw new TypeError("\"buf\" argument must be a string or an instance of Buffer");
    }
    var reader = new stream_1.Readable();
    var len = buf.length;
    var start = 0;
    // Overwrite _read method to push data from buffer.
    reader._read = function () {
        while (reader.push(buf.slice(start, (start += chunkSize)))) {
            // If all data pushed, just break the loop.
            if (start >= len) {
                reader.push(null);
                break;
            }
        }
    };
    return reader;
}
exports.bufferToStream = bufferToStream;
