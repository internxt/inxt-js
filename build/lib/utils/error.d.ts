export declare class WrappedError extends Error {
    header: string;
    constructor(message: string);
}
export declare const wrap: (header: string, err: Error) => WrappedError;
