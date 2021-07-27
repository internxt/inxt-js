"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDebuggerInstance = exports.logger = exports.Logger = void 0;
var Winston = __importStar(require("winston"));
var dotenv_1 = require("dotenv");
dotenv_1.config();
var loggerOptions = {
    levels: {
        warn: 0,
        debug: 1,
        error: 2,
        info: 3
    }
};
function parseLogLevel(level) {
    var levelNames = Object.keys(loggerOptions.levels);
    var valueIndex = Object.values(loggerOptions.levels).indexOf(level);
    if (valueIndex === -1) {
        return levelNames[levelNames.length - 1];
    }
    return levelNames[valueIndex];
}
var Logger = /** @class */ (function () {
    function Logger() {
    }
    Logger.getInstance = function (logLevel) {
        if (logLevel === void 0) { logLevel = 1; }
        if (!Logger.Instance) {
            Logger.Instance = getLoggerInstance(logLevel);
        }
        return Logger.Instance;
    };
    Logger.getDebugger = function (logLevel, debugCallback) {
        if (logLevel === void 0) { logLevel = 1; }
        if (!Logger.Debugger) {
            Logger.Debugger = exports.getDebuggerInstance(logLevel, debugCallback);
        }
        return Logger.Debugger;
    };
    return Logger;
}());
exports.Logger = Logger;
var getLoggerInstance = function (level, debug) {
    var levelName = parseLogLevel(level);
    var _logger = Winston.createLogger({
        level: levelName,
        exitOnError: true,
        handleExceptions: true,
        format: Winston.format.combine(Winston.format.colorize({ all: true }), Winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), Winston.format.splat(), Winston.format.printf(function (info) {
            if (debug && debug.enabled) {
                debug.debugCallback(info.message);
            }
            return info.timestamp + " " + info.level + ": " + info.message;
        })),
        transports: [new Winston.transports.Console()]
    });
    if (process.env.STAGE !== 'development') {
        _logger.silent = true;
    }
    return _logger;
};
exports.logger = getLoggerInstance(1);
exports.getDebuggerInstance = function (level, debugCallback) {
    return getLoggerInstance(1, { enabled: true, debugCallback: debugCallback });
};
