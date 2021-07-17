import { QueueObject, queue, ErrorCallback } from 'async';

export class ConcurrentQueue<K> {
  private totalTasks: number;
  private finishedTasks = 0;
  private queue: QueueObject<K>;

  constructor(concurrency = 1, totalTasks = 1, task: (content: K) => Promise<void>) {
    this.totalTasks = totalTasks;
    this.queue = queue(async (content: K, cb: ErrorCallback<Error>) => {
      task(content).then(() => {
        this.finishedTasks++;
        cb();
      }).catch(cb);
    }, concurrency);
  }

  push(content: K) {
    return this.queue.push(content);
  }

  end(cb?: () => void): void | Promise<void> {
    if (cb) {
      const intervalId = setInterval(() => {
        if (this.totalTasks === this.finishedTasks) {
          clearInterval(intervalId);
          cb();
        }
      }, 500);
    } else {
      return new Promise((r) => {
        const intervalId = setInterval(() => {
          if (this.totalTasks === this.finishedTasks) {
            clearInterval(intervalId);
            r();
          }
        }, 500);
      });
    }
  }
}
