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
exports.ActionState = exports.ActionTypes = void 0;
var events_1 = require("events");
var constants_1 = require("./constants");
var ActionTypes;
(function (ActionTypes) {
    ActionTypes["Download"] = "DOWNLOAD";
    ActionTypes["Upload"] = "UPLOAD";
})(ActionTypes = exports.ActionTypes || (exports.ActionTypes = {}));
var ActionState = /** @class */ (function (_super) {
    __extends(ActionState, _super);
    function ActionState(type) {
        var _this = _super.call(this) || this;
        _this.type = type;
        return _this;
    }
    ActionState.prototype.stop = function () {
        if (this.type === ActionTypes.Download) {
            this.emit(constants_1.DOWNLOAD_CANCELLED);
            return;
        }
        if (this.type === ActionTypes.Upload) {
            this.emit(constants_1.UPLOAD_CANCELLED);
        }
    };
    return ActionState;
}(events_1.EventEmitter));
exports.ActionState = ActionState;
