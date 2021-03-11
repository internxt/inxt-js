/// <reference types="node" />
import { Readable } from 'stream';
import { HTTPStatusCodes, HTTPHeaders, ContentType } from './http';
import { Stream } from 'stream';
export declare class NodeMock {
    port: number;
    path: string;
    ID: string;
    hostname: string;
    private _nodeResponse;
    private _shard;
    constructor(port: number, path: string, ID: string, hostname: string);
    set shard(s: Readable);
    set nodeResponse(nr: NodeResponse);
    get(nr: NodeRequest): NodeResponse;
    send(shardStream: Stream): Promise<NodeResponse>;
}
export declare class NodeRequest {
    port: number;
    hostname: string;
    path: string;
    headers: NodeRequestHeaders;
    protocol: string;
    url: string;
    token: string;
    constructor(hostname: string, path: string, port: number, headers: NodeRequestHeaders, token: string, shardHash: string);
}
export declare class NodeResponse {
    status: boolean;
    statusCode: HTTPStatusCodes;
    content: Readable;
    constructor(status: boolean, statusCode: HTTPStatusCodes, content?: Buffer | string, responseSize?: number);
    on(event: string, cb: () => void): void;
}
export declare class NodeRequestHeaders implements HTTPHeaders {
    contentType: ContentType.OCTET_STREAM;
    xStorjNodeId: string;
    constructor(contentType: ContentType.OCTET_STREAM, xStorjNodeId: string);
}
export declare class CaseNotImplementedError extends Error {
    message: string;
}
export declare const generateResponse: (type: HTTPStatusCodes, statusSize: number) => NodeResponse;
