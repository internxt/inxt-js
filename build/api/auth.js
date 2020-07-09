"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetBasicAuth = void 0;
var crypto_1 = require("../lib/crypto");
function GetBasicAuth(config) {
    var hash = crypto_1.sha256(Buffer.from(config.bridgePass)).toString('hex');
    return "Basic " + Buffer.from(config.bridgeUser + ":" + hash).toString('base64');
}
exports.GetBasicAuth = GetBasicAuth;
