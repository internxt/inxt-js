import { QueueObject } from 'async';
export declare class ConcurrentQueue<K> {
    private totalTasks;
    protected concurrency: number;
    private finishedTasks;
    protected queue: QueueObject<K>;
    constructor(concurrency?: number, totalTasks?: number, task?: (content: K) => Promise<void>);
    setQueueTask(task: (content: K) => Promise<void>): void;
    push(content: K): Promise<unknown>;
    end(cb?: () => void): void | Promise<void>;
}
