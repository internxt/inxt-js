import express from 'express';
import { Server } from 'http';

import { createHash, Hash } from 'crypto';
import { Transform, TransformCallback, TransformOptions } from 'stream';
import { ContractNegotiated } from '../../src/lib/contracts';

export class HashStream extends Transform {
  hasher: Hash;
  finalHash: Buffer;

  constructor(opts?: TransformOptions) {
    super(opts);
    this.hasher = createHash('sha256');
    this.finalHash = Buffer.alloc(0);
  }

  _transform(chunk: Buffer, enc: BufferEncoding, cb: TransformCallback) {
    this.hasher.update(chunk);
    cb(null, chunk);
  }

  _flush(cb: (err: Error | null) => void) {
    return this.hasher.end(cb);
  }

  readHash() {
    if (!this.finalHash.length) {
      this.finalHash = this.hasher.read();
    }

    return this.finalHash;
  }

  getFileHash() {
    if (!this.finalHash.length) {
      this.readHash();
    }

    return createHash('ripemd160').update(this.finalHash).digest();
  }

  getFsKey() {
    if (!this.finalHash.length) {
      this.readHash();
    }

    const fileHash = this.getFileHash();

    return createHash('ripemd160').update(fileHash).digest();
  }
}

let app: express.Application;
let server: Server;
const testServerPort = 54321;

export function getContractNegotiated(hash = '', token = ''): ContractNegotiated {
  return {
    operation: 'PUSH',
    farmer: {
      userAgent: '',
      lastSeen: 0,
      nodeID: '',
      protocol: '',
      address: 'localhost',
      port: testServerPort,
    },
    hash,
    token,
  };
}

type EndpointHandler = (req, res) => void;

function startServer(cb: () => void, customGet?: EndpointHandler, customPost?: EndpointHandler) {
  app = express();
  server = app.listen(testServerPort, () => {
    cb();
  });

  app.get(
    '/shards/:shardHash',
    customGet
      ? customGet
      : (req, res) => {
          res.status(200).send();
        },
  );

  app.post('/shards/:hash', (req, res) => {
    const hasher = new HashStream();

    req
      .pipe(hasher)
      .on('data', () => {})
      .on('error', (err) => {
        console.error('ERROR HASING SHARD', err);

        res.status(500).send({ err });
      })
      .on('end', () => {
        const fileHash = hasher.getFileHash().toString('hex');

        if (req.params.hash !== fileHash) {
          return res.status(400).send({ error: 'Calculated hash does not match the expected result' });
        }

        return res.status(200).send({ result: 'Consignment completed' });
      });
  });
}

function closeServer(cb: () => void) {
  server.close(() => {
    cb();
  });
}

type CloseServerFunction = () => Promise<unknown>;

const startApp = (customGet?: EndpointHandler, customPost?: EndpointHandler) =>
  new Promise((r) => startServer(() => r(null), customGet, customPost));
const closeApp = () => new Promise((r) => closeServer(() => r(null)));

export async function spawnFarmer(
  customGet?: EndpointHandler,
  customPost?: EndpointHandler,
): Promise<CloseServerFunction> {
  await startApp(customGet, customPost);

  return closeApp;
}
