import express from 'express';
import { createReadStream, createWriteStream } from 'fs';

export type ServerShutdownFunction = (cb: (err?: Error) => void) => void;

export function startServer(
  desiredPort: number,
  cb: (err: Error | null, shutdown: ServerShutdownFunction) => void
) {
  console.log('Starting shard-server on :' + desiredPort);

  const app = express();

  app.get('/shards/:hash', (req, res) => {
    const { hash } = req.params;

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

    req.pipe(writer).once('end', () => {
      res.status(200).send({ result: 'Consigment completed' });
    });
  }); 

  const server = app.listen(desiredPort, () => {
    console.log('shard-server started');

    cb(null, server.close.bind(server));
  });
}
