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
var ReedSolomonError = /** @class */ (function (_super) {
    __extends(ReedSolomonError, _super);
    // public readonly commonType: string;
    // public readonly isOperational: boolean;
    function ReedSolomonError(/*commonType: string,*/ description /*, isOperational: boolean*/) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, description) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype); // restore prototype chain
        // this.commonType = commonType
        // this.isOperational = isOperational
        Error.captureStackTrace(_this);
        return _this;
    }
    return ReedSolomonError;
}(Error));
exports.default = ReedSolomonError;
