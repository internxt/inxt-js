import { expect } from 'chai';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { determineShardSize } from '../../src/lib/utils';

import { Aes256ctrDecrypter, Aes256ctrEncrypter, sha256 } from '../../src/lib/crypto';

import EncryptStream from '../../src/lib/encryptStream';
import { FunnelStream } from '../../src/lib/funnelStream';

const key = Buffer.from('1111111111111111111111111111111111111111111111111111111111111111', 'hex');
const iv = Buffer.from('11111111111111111111111111111111', 'hex');

describe('# Sharding tests', () => {
  describe('# Should encrypt correctly', () => {
    it('When chunks matches exactly with shard size', function (done) {
      const size = 16000000;
      const chunkSize = determineShardSize(size);
      const chunks = Math.ceil(size / chunkSize);

      const decryptedContent = Buffer.alloc(size).toString();

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      let chunksCounter = 0;
      for (let i = 0; i < size; i += chunkSize) {
        chunksCounter++;
        encryptStream.write(decryptedContent.slice(i, i + chunkSize));
      }
      encryptStream.end();

      expect(chunksCounter).to.equal(chunks);

      const fileChunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        fileChunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(fileChunks).toString());
        done();
      });
    });

    it('When last chunk size is lower than shard size', function (done) {
      const size = 15999999;
      const shardSize = determineShardSize(size);
      const chunks = Math.ceil(size / shardSize);

      const decryptedContent = Buffer.alloc(size).toString();

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      let chunksCounter = 0;
      for (let i = 0; i < size; i += shardSize) {
        chunksCounter++;
        encryptStream.write(decryptedContent.slice(i, i + shardSize));
      }
      encryptStream.end();

      expect(chunksCounter).to.equal(chunks);

      const fileChunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        fileChunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(fileChunks).toString());
        done();
      });
    });

    it('When last chunk size is bigger than shard size', function (done) {
      const size = 16000001;
      const shardSize = determineShardSize(size);
      const chunks = Math.ceil(size / shardSize);

      const decryptedContent = Buffer.alloc(size).toString();

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      let chunksCounter = 0;
      for (let i = 0; i < size; i += shardSize) {
        chunksCounter++;
        encryptStream.write(decryptedContent.slice(i, i + shardSize));
      }
      encryptStream.end();

      expect(chunksCounter).to.equal(chunks);

      const fileChunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        fileChunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(fileChunks).toString());
        done();
      });
    });
  });

  describe('# Should slice and encrypt correctly', () => {
    it('When chunks matches exactly with shard size', function (done) {
      const size = 16000000;
      const chunkSize = determineShardSize(size);

      const decryptedContent = Buffer.alloc(size).toString();

      const slicerStream = new FunnelStream(chunkSize);

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      Readable.from(decryptedContent).pipe(slicerStream).pipe(encryptStream);

      const chunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(chunks).toString());
        done();
      });
    });

    it('When last chunk size is lower than shard size', function (done) {
      const size = 15999999;
      const chunkSize = determineShardSize(size);

      const decryptedContent = Buffer.alloc(size).toString();

      const slicerStream = new FunnelStream(chunkSize);

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      Readable.from(decryptedContent).pipe(slicerStream).pipe(encryptStream);

      const chunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(chunks).toString());
        done();
      });
    });

    it('When last chunk size is bigger than shard size', function (done) {
      const size = 16000001;
      const chunkSize = determineShardSize(size);

      const decryptedContent = Buffer.alloc(size).toString();

      const slicerStream = new FunnelStream(chunkSize);

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      Readable.from(decryptedContent).pipe(slicerStream).pipe(encryptStream);

      const chunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(chunks).toString());
        done();
      });
    });
  });

  describe('# Should slice and encrypt correctly', () => {
    it('When chunks matches exactly with shard size', function (done) {
      this.timeout(40000);

      const size = 16000000;
      const chunkSize = determineShardSize(size);

      const decryptedContentBuffer = Buffer.alloc(size);
      decryptedContentBuffer.fill(1);

      const decryptedContent = decryptedContentBuffer.toString();

      const slicerStream = new FunnelStream(chunkSize);

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      const chunks: Buffer[] = [];

      Readable.from(decryptedContent).pipe(createWriteStream('test.txt'));

      Readable.from(decryptedContent)
        .pipe(slicerStream)
        .pipe(encryptStream)
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          console.log('SHA256 %s', sha256(chunk).toString('hex'));
        })
        .on('end', () => {
          Readable.from(Buffer.concat(chunks)).pipe(createWriteStream('res.txt'));

          expect(encryptedContent.toString()).to.equal(Buffer.concat(chunks).toString());
          done();
        });
    });

    it('When last chunk size is lower than shard size', function (done) {
      const size = 15999999;
      const chunkSize = determineShardSize(size);

      const decryptedContent = Buffer.alloc(size).toString();

      const slicerStream = new FunnelStream(chunkSize);

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      Readable.from(decryptedContent).pipe(slicerStream).pipe(encryptStream);

      const chunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(chunks).toString());
        done();
      });
    });

    it('When last chunk size is bigger than shard size', function (done) {
      const size = 16000001;
      const chunkSize = determineShardSize(size);

      const decryptedContent = Buffer.alloc(size).toString();

      const slicerStream = new FunnelStream(chunkSize);

      const encrypter = Aes256ctrEncrypter(key, iv);
      const encryptedContent = encrypter.update(decryptedContent);

      expect(decryptedContent).to.equal(Aes256ctrDecrypter(key, iv).update(encryptedContent).toString());

      const encryptStream = new EncryptStream(key, iv);

      Readable.from(decryptedContent).pipe(slicerStream).pipe(encryptStream);

      const chunks: Buffer[] = [];
      encryptStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      encryptStream.on('end', () => {
        expect(encryptedContent.toString()).to.equal(Buffer.concat(chunks).toString());
        done();
      });
    });
  });
});
