import express from 'express';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { HashStream } from '../src/lib/hasher';
import { logger } from '../src/lib/utils/logger';

export type ServerShutdownFunction = (cb: (err?: Error) => void) => void;

export function startServer(
  desiredPort: number,
  cb: (err: Error | null, shutdown: ServerShutdownFunction) => void
) {
  console.log('Starting shard-server on :' + desiredPort);

  const app = express();

  app.use(function middleware(req, res, next) {
    logger.info('[SHARD-SERVER]: Received a request to %s', req.path);
    next();
  })

  app.get('/shards/:hash', (req, res) => {
    const { hash } = req.params;
    console.log('Received a request download for shard %s', hash);

    if (!hash) {
      return res.status(400).send({ error: 'Invalid hash format' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    createReadStream(hash).pipe(res);
  }); 

  app.post('/shards/:hash', (req, res) => {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).send({ error: 'Invalid hash format' });
    }

    const writer = createWriteStream(hash);
    const hasher = new HashStream();

    pipeline(req, hasher, writer, (err) => {
      if (err) {
        return res.status(500).send({ error: err });
      }

      if (hasher.getHash().toString('hex') === hash) {
        return res.status(200).send({ result: 'Consignment completed' });
      }
      res.status(400).send({ result: 'Hash mismatched' });
    })
  }); 

  const server = app.listen(desiredPort, () => {
    console.log('shard-server started');

    cb(null, server.close.bind(server));
  });
}
