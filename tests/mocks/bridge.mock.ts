import express from 'express';
import { Server } from 'http';
import { CreateEntryFromFrameBody } from '../../src/services/api';

let app: express.Application;
let server: Server;
const testServerPort = 54321;

function startServer(cb: () => void) {
  app = express();
  server = app.listen(testServerPort, () => {
    cb();
  });

  app.get('/buckets/:bucketId', (req, res) => {
    res.status(200).send({ id: req.params.bucketId });
  });

  app.get('/buckets/:bucketId/file-ids/:fileId', (req, res) => {
    if (!req.params.fileId || !req.params.bucketId) {
      return res.status(400).send({ error: 'Not provided required params' });
    }
    res.status(200).send({ id: req.params.fileId });
  });

  app.post('/frames', (req, res) => {
    res.status(200).send({ id: 'id', user: 'fake@user.com' });
  });

  app.post('/buckets/:bucketId/files', (req, res) => {
    try {
      const body: CreateEntryFromFrameBody = req.body;
      const { frame, hmac } = body;
      const { value, type } = hmac;
      res.status(200).send({ id: 'id' });
    } catch (err) {
      console.log('err', err);
      res.status(400).send({ error: err })
    }
  });
}

function closeServer(cb: () => void) {
  server.close(() => {
    cb();
  });
}

type CloseServerFunction = () => Promise<unknown>;

const startApp = () => new Promise(r => startServer(() => r(null)));
const closeApp = () => new Promise(r => closeServer(() => r(null)));

export async function spawnBridge(): Promise<CloseServerFunction> {
  await startApp();

  return closeApp;
}
