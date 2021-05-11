import { Readable } from 'stream';
import { randomBytes } from 'crypto';
import { HTTPStatusCodes, HTTPHeaders, ContentType } from './http';
import { Stream } from 'stream';

export class NodeMock {
    public port: number;
    public path: string;
    public ID: string;
    public hostname: string;

    private _nodeResponse: NodeResponse;
    private _shard: Readable;

    constructor(port: number, path: string, ID: string, hostname: string) {
        this.port = port;
        this.path = path;
        this.ID = ID;
        this.hostname = hostname;
        this._nodeResponse = new NodeResponse(true, 200, 'response', 8);
        this._shard = Readable.from('');
    }

    set shard(s: Readable) {
        this._shard = this.shard;
    }

    set nodeResponse(nr: NodeResponse) {
        this._nodeResponse = nr;
    }

    get(nr: NodeRequest): NodeResponse {
        return this._nodeResponse;
    }

    send(shardStream: Stream): Promise <NodeResponse> {
        return Promise.resolve(this._nodeResponse);
    }
}

export class NodeRequest {
    public port: number;
    public hostname: string;
    public path: string;
    public headers: NodeRequestHeaders;
    public protocol = 'http'; // use always http
    public url: string;
    public token: string;

    constructor(
        hostname: string,
        path: string,
        port: number,
        headers: NodeRequestHeaders,
        token: string,
        shardHash: string
    ) {
        this.port = port;
        this.hostname = hostname;
        this.path = path;
        this.headers = headers;
        this.token = token;
        this.url = `${this.protocol}://${hostname}:${port}/shards/${shardHash}?token=${token}`;
    }
}

export class NodeResponse {
    public status: boolean;
    public statusCode: HTTPStatusCodes;
    public content: Readable;

    constructor(status: boolean, statusCode: HTTPStatusCodes, content?: Buffer | string, responseSize?: number) {
        this.status = status;
        this.statusCode = statusCode;
        this.content = Readable.from('');

        if (responseSize) {
            this.content = Readable.from(randomBytes(responseSize));
        } else {
            if (content instanceof String) {
                this.content = Readable.from(Buffer.from(content));
            }
        }
    }

    on(event: string, cb: () => void): void {
        this.content.on(event, () => cb);
    }
}

export class NodeRequestHeaders implements HTTPHeaders {
    contentType: ContentType.OCTET_STREAM;
    xStorjNodeId: string;

    constructor(contentType: ContentType.OCTET_STREAM, xStorjNodeId: string) {
        this.contentType = contentType;
        this.xStorjNodeId = xStorjNodeId;
    }
}

export class CaseNotImplementedError extends Error {
    message = 'Type not implemented yet';
}

export const generateResponse = (type: HTTPStatusCodes, statusSize: number): NodeResponse => {
    switch (type) {
        case HTTPStatusCodes.OK:
            return new NodeResponse(true, type, '', statusSize);
        case HTTPStatusCodes.BAD_REQUEST:
            return new NodeResponse(false, type, '', statusSize);
        case HTTPStatusCodes.UNAUTHORIZED:
            return new NodeResponse(false, type, '', statusSize);
        case HTTPStatusCodes.NOT_FOUND:
            return new NodeResponse(false, type, '', statusSize);
        case HTTPStatusCodes.INTERNAL_SERVER_ERROR:
            return new NodeResponse(false, type, '', statusSize);
        default:
            throw new CaseNotImplementedError();
    }
};
