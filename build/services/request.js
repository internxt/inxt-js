"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = exports.authmethod = void 0;
var AuthMethod = /** @class */ (function () {
    function AuthMethod() {
    }
    AuthMethod.BasicAuth = "1";
    return AuthMethod;
}());
function authmethod(authMethod) {
    if (authMethod === AuthMethod.BasicAuth) {
    }
}
exports.authmethod = authmethod;
function request(method, path, params) {
}
exports.request = request;
