import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { expect } from 'chai';
import { spy } from 'sinon';

import { Tap, TapEvents } from '../../src/lib/TapStream';
import { createReadStream, createWriteStream, existsSync, unlinkSync } from 'fs';

const defaultReadableHighWatermark = 16384;
const testFilePath = 'tapbinarydatatest';

after(() => {
  if (existsSync(testFilePath)) {
    unlinkSync(testFilePath);
  }
});

describe('# Tap tests', () => {
  it('Should work when: binary data length < diameterSize', (done) => {
    const diameterSize = 10;
    const binaryDataLength = 1;
    const readable = Readable.from(randomBytes(binaryDataLength));
    const tap = new Tap(diameterSize);

    expect(binaryDataLength < diameterSize).to.be.true;

    readable
      .pipe(tap)
      .on('data', (chunk: Buffer) => {
        expect(chunk.length).to.equal(binaryDataLength);
      })
      .once('end', () => {
        tap.removeAllListeners();
        done();
      });
  });

  it('Should work when: binary data length == diameterSize', (done) => {
    const diameterSize = 10;
    const binaryDataLength = 10;
    const readable = Readable.from(randomBytes(binaryDataLength));
    const tap = new Tap(diameterSize);

    expect(diameterSize).to.equal(binaryDataLength);

    readable
      .pipe(tap)
      .on('data', (chunk: Buffer) => {
        expect(chunk.length).to.equal(binaryDataLength);
      })
      .once('end', () => {
        tap.removeAllListeners();
        done();
      });
  });

  it('Should work when: binary data length > diameterSize', (done) => {
    const diameterSize = defaultReadableHighWatermark + 1;
    const binaryDataLength = diameterSize + 1;
    const binaryData = randomBytes(binaryDataLength);

    const tempPathFile = testFilePath;
    const tempWriteStream = createWriteStream(tempPathFile);

    Readable.from(binaryData)
      .pipe(tempWriteStream)
      .once('finish', () => {
        const readable = createReadStream(tempPathFile, {
          highWaterMark: defaultReadableHighWatermark,
        });
        const tap = new Tap(diameterSize);

        expect(diameterSize > defaultReadableHighWatermark).to.be.true;
        expect(binaryDataLength > diameterSize).to.be.true;

        const closeEventListener = spy();

        tap.on(TapEvents.Closed, closeEventListener);
        tap.on(TapEvents.Closed, tap.open.bind(tap));

        let result = Buffer.alloc(0);

        readable
          .pipe(tap)
          .on('data', (chunk: Buffer) => {
            result = Buffer.concat([result, chunk]);
          })
          .once('end', () => {
            tap.removeAllListeners();

            expect(closeEventListener.calledOnce).to.be.true;
            expect(result.length).to.equal(binaryDataLength);
            expect(Buffer.compare(result, binaryData)).to.equal(0);
            done();
          });
      });
  });

  it('Should work when: binary data length == (2 * diameterSize)', (done) => {
    const diameterSize = defaultReadableHighWatermark + 1;
    const binaryDataLength = 2 * diameterSize;
    const binaryData = randomBytes(binaryDataLength);

    expect(binaryDataLength === 2 * diameterSize).to.be.true;

    const tempPathFile = testFilePath;
    const tempWriteStream = createWriteStream(tempPathFile);

    Readable.from(binaryData)
      .pipe(tempWriteStream)
      .once('finish', () => {
        const readable = createReadStream(tempPathFile, {
          highWaterMark: defaultReadableHighWatermark,
        });
        const tap = new Tap(diameterSize);

        expect(diameterSize > defaultReadableHighWatermark).to.be.true;
        expect(binaryDataLength > diameterSize).to.be.true;

        const closeEventListener = spy();

        tap.on(TapEvents.Closed, closeEventListener);
        tap.on(TapEvents.Closed, tap.open.bind(tap));

        let result = Buffer.alloc(0);

        readable
          .pipe(tap)
          .on('data', (chunk: Buffer) => {
            result = Buffer.concat([result, chunk]);
          })
          .once('end', () => {
            tap.removeAllListeners();

            expect(closeEventListener.calledOnce).to.be.true;
            expect(result.length).to.equal(binaryDataLength);
            expect(Buffer.compare(result, binaryData)).to.equal(0);
            done();
          });
      });
  });

  it('Should work when: binary data length == (2 * diameterSize + 1)', (done) => {
    const diameterSize = defaultReadableHighWatermark + 1;
    const binaryDataLength = 2 * diameterSize + 1;
    const binaryData = randomBytes(binaryDataLength);

    expect(binaryDataLength === 2 * diameterSize + 1).to.be.true;

    const tempPathFile = testFilePath;
    const tempWriteStream = createWriteStream(tempPathFile);

    Readable.from(binaryData)
      .pipe(tempWriteStream)
      .once('finish', () => {
        const readable = createReadStream(tempPathFile, {
          highWaterMark: defaultReadableHighWatermark,
        });
        const tap = new Tap(diameterSize);

        expect(diameterSize > defaultReadableHighWatermark).to.be.true;
        expect(binaryDataLength > diameterSize).to.be.true;

        const closeEventListener = spy();

        tap.on(TapEvents.Closed, closeEventListener);
        tap.on(TapEvents.Closed, tap.open.bind(tap));

        let result = Buffer.alloc(0);

        readable
          .pipe(tap)
          .on('data', (chunk: Buffer) => {
            result = Buffer.concat([result, chunk]);
          })
          .once('end', () => {
            tap.removeAllListeners();

            expect(closeEventListener.calledOnce).to.be.true;
            expect(result.length).to.equal(binaryDataLength);
            expect(Buffer.compare(result, binaryData)).to.equal(0);
            done();
          });
      });
  });
});
