"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = exports.WrappedError = void 0;
var WrappedError = /** @class */ (function (_super) {
    __extends(WrappedError, _super);
    function WrappedError(message) {
        var _this = _super.call(this, message) || this;
        _this.header = '';
        return _this;
    }
    return WrappedError;
}(Error));
exports.WrappedError = WrappedError;
exports.wrap = function (header, err) {
    var wrappedError = new WrappedError(header + ': ' + err.message);
    wrappedError.stack = err.stack;
    wrappedError.name = err.name;
    wrappedError.header = header;
    return wrappedError;
};
