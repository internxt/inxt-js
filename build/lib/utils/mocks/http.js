"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPStatusCodes = exports.ContentType = void 0;
var ContentType;
(function (ContentType) {
    ContentType["AAC"] = "audio/aac";
    ContentType["AVI"] = "video/x-msvideo";
    ContentType["CSS"] = "text/css";
    ContentType["CSV"] = "text/csv";
    ContentType["HTML"] = "text/html";
    ContentType["HTM"] = "text/html";
    ContentType["JS"] = "application/javascript";
    ContentType["TEXT_PLAIN"] = "text/plain";
    ContentType["OCTET_STREAM"] = "application/octet-stream";
})(ContentType = exports.ContentType || (exports.ContentType = {}));
var HTTPStatusCodes;
(function (HTTPStatusCodes) {
    HTTPStatusCodes[HTTPStatusCodes["OK"] = 200] = "OK";
    HTTPStatusCodes[HTTPStatusCodes["CREATED"] = 201] = "CREATED";
    HTTPStatusCodes[HTTPStatusCodes["ACCEPTED"] = 202] = "ACCEPTED";
    HTTPStatusCodes[HTTPStatusCodes["NO_CONTENT"] = 204] = "NO_CONTENT";
    HTTPStatusCodes[HTTPStatusCodes["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HTTPStatusCodes[HTTPStatusCodes["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HTTPStatusCodes[HTTPStatusCodes["NOT_FOUND"] = 404] = "NOT_FOUND";
    HTTPStatusCodes[HTTPStatusCodes["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    HTTPStatusCodes[HTTPStatusCodes["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HTTPStatusCodes[HTTPStatusCodes["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
})(HTTPStatusCodes = exports.HTTPStatusCodes || (exports.HTTPStatusCodes = {}));
