"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = void 0;
var Contract = /** @class */ (function () {
    function Contract() {
    }
    Contract.buildRequestUrl = function (contract) {
        return "http://" + contract.farmer.address + ":" + contract.farmer.port + "/upload/link/" + contract.hash;
    };
    return Contract;
}());
exports.Contract = Contract;
