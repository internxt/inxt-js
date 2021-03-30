export declare class Mutex {
    private mutex;
    lock(): PromiseLike<() => void>;
    dispatch(fn: (() => void) | (() => PromiseLike<void>)): Promise<void>;
}
