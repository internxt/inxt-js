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
exports.logger = void 0;
var Winston = __importStar(require("winston"));
var dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '/home/inxt/inxt-js/.env' });
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
var getLoggerInstance = function (level) {
    var levelName = parseLogLevel(level);
    var logger = Winston.createLogger({
        level: levelName,
        exitOnError: true,
        handleExceptions: true,
        format: Winston.format.combine(Winston.format.colorize({ all: true }), Winston.format.timestamp({ format: 'YYYY-MM-DD HH:MM:SS' }), Winston.format.splat(), Winston.format.printf(function (info) { return info.timestamp + " " + info.level + ": " + info.message; })),
        transports: [new Winston.transports.Console()]
    });
    // console.log(process.env.STAGE)
    // if (process.env.STAGE !== 'development') {
    //     logger.silent = true;
    // }
    return logger;
};
exports.logger = getLoggerInstance(1);
