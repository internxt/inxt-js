"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapt = void 0;
var stream_to_blob_1 = __importDefault(require("stream-to-blob"));
function adapt(options) {
    return __assign(__assign({}, options), { finishedCallback: function (err, downloadStream) {
            if (err) {
                return options.finishedCallback(err, null);
            }
            if (!downloadStream) {
                return options.finishedCallback(Error('Empty download stream'), null);
            }
            stream_to_blob_1.default(downloadStream, 'application/octet-stream').then(function (blob) {
                options.finishedCallback(null, blob);
            });
        } });
}
exports.adapt = adapt;
