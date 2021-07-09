class WrappedError extends Error {
    header: string;

    constructor(header: string) {
        super();

        this.header = header;
    }
}

export const wrap = (header: string, err: Error) => {
    const wrappedError = new WrappedError(header + ': ' + err.message);

    wrappedError.stack = err.stack;
    wrappedError.name = err.name;
    wrappedError.header = header;

    return wrappedError;
};
