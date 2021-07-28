import { expect } from 'chai';

import { ShardObject } from '../../src/api/ShardObject';
import { generateShardMeta } from '../mocks/shardMeta.mock';
import { spawnFarmer } from '../mocks/farmer.mock';
import { Bridge } from '../../src/services/api';
import { ripemd160, sha256 } from '../../src/lib/crypto';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { EnvironmentConfig } from '../../src';

const config: EnvironmentConfig = { bridgePass: '', bridgeUser: '', bridgeUrl: 'https://api.internxt.com', useProxy: false };
const bridge = new Bridge(config);
const shardMeta = generateShardMeta();
let shardObject = new ShardObject(bridge, '', shardMeta);

describe('api/ShardObject.ts tests', () => {
  describe('size()', () => {
    it('Should return size as provided from meta', () => {
      expect(shardMeta.size).to.eq(shardObject.size);
    });
  });

  describe('hash()', () => {
    it('Should return hash as provided from meta', () => {
      expect(shardMeta.hash).to.eq(shardObject.hash);
    });
  });

  describe('index()', () => {
    it('Should return index as provided from meta', () => {
      expect(shardMeta.index).to.eq(shardMeta.index);
    });
  });

  describe('upload()', () => {
    it('Should throw if frameId is not provided', async () => {
      try {
        await shardObject.upload(Buffer.from(''));
      } catch (err) {
        expect(err.message).to.equal('Frame id not provided');
      }
    });
  });

  describe('download()', () => {
    it('Should throw if shard is not provided', () => {
      expect(() => {
        const shardObject = new ShardObject(bridge, '', shardMeta);
        shardObject.download();
      }).to.throw('Provide shard info before trying to download a shard');
    });

    it('Should download the shard from the node correctly', (done) => {
      const shardEncrypted = randomBytes(1024 * 1024);
      const shardHash = ripemd160(sha256(shardEncrypted)).toString('hex');

      const shard = {
        hash: shardHash,
        index: 0,
        operation: 'PULL',
        parity: false, 
        replaceCount: 0,
        size: shardEncrypted.length,
        token: '',
        farmer: {
          address: 'localhost',
          lastSeen: new Date(),
          nodeID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          port: 54321,
          protocol: 'http',
          userAgent: '1.2.0-INXT'
        }
      };
      
      spawnFarmer((req, res) => {
        Readable.from(shardEncrypted).pipe(res);
      }).then((stopFarmer) => {
        const shardObject = new ShardObject(bridge, '', shardMeta, shard);

        shardObject.download().then((shardStream) => {
          const chunks: Buffer[] = []
          shardStream.on('data', (chunk) => {
            chunks.push(chunk);
          });

          shardStream.on('end', () => {
            expect(chunks).to.not.be.empty;

            const hash = ripemd160(sha256(Buffer.concat(chunks))).toString('hex');

            expect(hash).to.equal(shard.hash);
            stopFarmer().finally(() => done());
          });
        });
      });
    });
  });
});