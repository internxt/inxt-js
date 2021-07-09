export const wrap = (header: string, err: Error) => {
    const wrappedError = new Error(header + ': ' + err.message);

    wrappedError.stack = err.stack;
    wrappedError.name = err.name;
    
    return wrappedError;
}