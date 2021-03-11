"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NODE_ERRORS = exports.CONTRACT_ERRORS = exports.ERRORS = void 0;
var ERRORS;
(function (ERRORS) {
    ERRORS["FILE_ALREADY_EXISTS"] = "File already exists";
    ERRORS["FILE_NOT_FOUND"] = "File not found";
    ERRORS["BUCKET_NOT_FOUND"] = "Bucket not found";
})(ERRORS = exports.ERRORS || (exports.ERRORS = {}));
var CONTRACT_ERRORS;
(function (CONTRACT_ERRORS) {
    CONTRACT_ERRORS["INVALID_SHARD_SIZES"] = "Invalid shard sizes";
    CONTRACT_ERRORS["NULL_NEGOTIATED_CONTRACT"] = "Null negotiated contract";
})(CONTRACT_ERRORS = exports.CONTRACT_ERRORS || (exports.CONTRACT_ERRORS = {}));
var NODE_ERRORS;
(function (NODE_ERRORS) {
    NODE_ERRORS["INVALID_TOKEN"] = "The supplied token is not accepted";
    NODE_ERRORS["REJECTED_SHARD"] = "Node rejected shard";
    NODE_ERRORS["NO_SPACE_LEFT"] = "No space left";
    NODE_ERRORS["NOT_CONNECTED_TO_BRIDGE"] = "Not connected to bridge";
    NODE_ERRORS["UNABLE_TO_LOCATE_CONTRACT"] = "Unable to locate contract";
    NODE_ERRORS["DATA_SIZE_IS_NOT_AN_INTEGER"] = "Data size is not an integer";
    NODE_ERRORS["UNABLE_TO_DETERMINE_FREE_SPACE"] = "Unable to determine free space";
    NODE_ERRORS["SHARD_HASH_NOT_MATCHES"] = "Calculated hash does not match the expected result";
    NODE_ERRORS["SHARD_SIZE_BIGGER_THAN_CONTRACTED"] = "Shard exceeds the amount defined in the contract";
})(NODE_ERRORS = exports.NODE_ERRORS || (exports.NODE_ERRORS = {}));
