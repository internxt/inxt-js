import { expect } from 'chai';
import { Mutex } from '../src/lib/utils/mutex';

const mutex = new Mutex();

const sharedObject = { counter: 0 };

describe('# Mutex tests', () => {
  it('Should increment and decrement without race conditions', async function () {
    const loops = 2;
    const iterations = 1000;
    const randomMaxMultiplier = 5;

    this.timeout(iterations * randomMaxMultiplier * loops);

    const promises = [];

    for (let i = 0; i < iterations; i++) {
      promises.push(
        mutex.dispatch(async () => {
          await new Promise((resolve) =>
            setTimeout(() => resolve(sharedObject.counter++), Math.random() * randomMaxMultiplier),
          );
        }),
      );
    }

    for (let i = 0; i < iterations; i++) {
      promises.push(
        mutex.dispatch(async () => {
          await new Promise((resolve) =>
            setTimeout(() => resolve(sharedObject.counter--), Math.random() * randomMaxMultiplier),
          );
        }),
      );
    }

    await Promise.all(promises);

    expect(sharedObject.counter).to.equal(0);
  });
});
