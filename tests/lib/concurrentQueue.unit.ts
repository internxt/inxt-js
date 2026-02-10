import { expect } from 'chai';

import { ConcurrentQueue } from '../../src/lib/concurrentQueue';

interface TestContent {
  counter: number;
}

const incrementCounter = (t: TestContent) => {
  t.counter++;
  return new Promise((resolve: (x: any) => void) => {
    setTimeout(() => {
      resolve(null);
    }, 10);
  });
};

const defConcurrency = 1;
let queue: ConcurrentQueue<TestContent> = new ConcurrentQueue<TestContent>(
  defConcurrency,
  defConcurrency,
  incrementCounter,
);

describe('# lib/concurrentQueue tests', () => {
  describe('constructor()', () => {
    it('Should throw if concurrency > total tasks to perform', () => {
      expect(() => {
        new ConcurrentQueue<TestContent>(defConcurrency, 0, incrementCounter);
      }).to.throw;
    });
  });

  describe('end()', () => {
    it('Should end after all tasks end (concurrency = 1 = totalTasks)', function (done) {
      const concurrency = 1;
      const totalTasks = concurrency;

      const tasks: TestContent[] = [];

      for (let i = 0; i < totalTasks; i++) {
        tasks.push({ counter: 0 });
      }

      queue = new ConcurrentQueue<TestContent>(concurrency, totalTasks, incrementCounter);

      tasks.forEach(queue.push.bind(queue));

      queue.end(() => {
        tasks.forEach((task) => {
          expect(task.counter).to.equal(1);
        });
        done();
      });
    });

    it('Should end after all tasks end (concurrency = 1 < totalTasks)', function (done) {
      const concurrency = 1;
      const totalTasks = concurrency + 3;

      const tasks: TestContent[] = [];

      for (let i = 0; i < totalTasks; i++) {
        tasks.push({ counter: 0 });
      }

      queue = new ConcurrentQueue<TestContent>(concurrency, totalTasks, incrementCounter);

      tasks.forEach(queue.push.bind(queue));

      queue.end(() => {
        tasks.forEach((task) => {
          expect(task.counter).to.equal(1);
        });
        done();
      });
    });

    it('Should end after all tasks end (concurrency = totalTasks > 1)', function (done) {
      const concurrency = 3;
      const totalTasks = concurrency;

      const tasks: TestContent[] = [];

      for (let i = 0; i < totalTasks; i++) {
        tasks.push({ counter: 0 });
      }

      queue = new ConcurrentQueue<TestContent>(concurrency, totalTasks, incrementCounter);

      tasks.forEach(queue.push.bind(queue));

      queue.end(() => {
        tasks.forEach((task) => {
          expect(task.counter).to.equal(1);
        });
        done();
      });
    });

    it('Should end after all tasks end (totalTasks > concurrency > 1)', function (done) {
      const concurrency = 3;
      const totalTasks = concurrency + 6;

      const tasks: TestContent[] = [];

      for (let i = 0; i < totalTasks; i++) {
        tasks.push({ counter: 0 });
      }

      queue = new ConcurrentQueue<TestContent>(concurrency, totalTasks, incrementCounter);

      tasks.forEach(queue.push.bind(queue));

      queue.end(() => {
        tasks.forEach((task) => {
          expect(task.counter).to.equal(1);
        });
        done();
      });
    });
  });
});
