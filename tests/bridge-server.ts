import express from 'express';

export type ServerShutdownFunction = (cb: (err?: Error) => void) => void;

export function startServer(
  desiredPort: number,
  cb: (err: Error | null, shutdown: ServerShutdownFunction) => void
) {
  console.log('Starting bridge-server on :' + desiredPort);

  const app = express();

  // checkBucketExistence()
  app.get('/buckets/:id', (req, res) => {
    if (!req.params.id) {
      return res.status(400).send();
    }

    res.status(200).send();
  });

  // stage()
  app.post('/frames', (_, res) => {
    res.status(200).send({ id: 'testId' });
  });

  // addShardToFrame()
  app.put('/frames/:id', (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send();
    }

    res.status(200).send({
      hash: '',
      token: '',
      operation: 'PUSH',
      farmer: {
        userAgent: '',
        protocol: 'http',
        address: 'localhost',
        port: desiredPort,
        nodeID: 'testId',
        lastSeen: new Date()
      }
    });
  });

  // createEntryFromFrame()
  app.post('/buckets/:id/files', (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send();
    }

    res.status(200).send({
      id: 'testFileId',
      index: 'testIndex',
      frame: 'testFrameId',
      bucket: 'testBucketId',
      mimetype: 'application/octet-stream',
      name: 'testName',
      renewal: 'renewalName',
      created: 'testCreated',
      hmac: {
        value: 'testValue',
        type: 'testType'
      },
      erasure: {
        type: 'erasure'
      },
      size: 0
    });
  });

  const server = app.listen(desiredPort, () => {
    console.log('bridge-server started');

    cb(null, server.close.bind(server));
  });
}
