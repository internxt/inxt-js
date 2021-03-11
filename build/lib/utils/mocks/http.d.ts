export interface HTTPHeaders {
    contentType: ContentType;
}
export declare enum ContentType {
    AAC = "audio/aac",
    AVI = "video/x-msvideo",
    CSS = "text/css",
    CSV = "text/csv",
    HTML = "text/html",
    HTM = "text/html",
    JS = "application/javascript",
    TEXT_PLAIN = "text/plain",
    OCTET_STREAM = "application/octet-stream"
}
export declare enum HTTPStatusCodes {
    OK = 200,
    CREATED = 201,
    ACCEPTED = 202,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    NOT_FOUND = 404,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    GATEWAY_TIMEOUT = 504
}
