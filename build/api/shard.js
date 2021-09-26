"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequestUrl = void 0;
function buildRequestUrl(shard) {
    var _a = shard.farmer, address = _a.address, port = _a.port;
    return "http://" + address + ":" + port + "/download/link/" + shard.hash;
}
exports.buildRequestUrl = buildRequestUrl;
