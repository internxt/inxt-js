import { randomBytes } from 'crypto';
import express from 'express';

export type ServerShutdownFunction = (cb: (err?: Error) => void) => void;

interface Mirror {
  index: number;
  replaceCount: number;
  hash: string;
  size: number;
  parity: boolean;
  token: string;
  farmer: {
    userAgent: string
    protocol: string
    address: string
    port: number
    nodeID: string
    lastSeen: Date
  };
  operation: string;
}

interface Frame {
  id: string;
  mirrors: Mirror[];
}
interface BridgeFile {
  id: string,
  frame: Frame
}

export function startServer(
  desiredPort: number,
  farmerPort: number,
  cb: (err: Error | null, shutdown: ServerShutdownFunction) => void
) {
  console.log('Starting bridge-server on :' + desiredPort);

  const app = express();
  app.use(express.json());

  const files: BridgeFile[] = [];
  const frames: Frame[] = [];

  // checkBucketExistence()
  app.get('/buckets/:id', (req, res) => {
    if (!req.params.id) {
      return res.status(400).send();
    }

    res.status(200).send();
  });

  // getFileInfo()
  app.get('/buckets/:bucketId/files/:fileId/info', (req, res) => {
    const { bucketId, fileId } = req.params;

    if (!bucketId || !fileId) {
      return res.status(400).send();
    }

    const maybeFile = files.find(f => f.id === fileId);

    if (!maybeFile) {
      return res.status(404).send();
    }

    return res.status(200).send({
      id: maybeFile.id,
      frame: maybeFile.frame,
      size: 0
    });
  });

  // getFileMirror()
  app.get('/buckets/:bucketId/files/:fileId', (req, res) => {
    const { bucketId, fileId } = req.params;
    const { skip, limit } = req.query;

    if (!bucketId || !fileId) {
      return res.status(400).send();
    }

    const maybeFile = files.find(f => f.id === fileId);

    if(!maybeFile) {
      return res.status(404).send();
    }

    const frame = frames.find(f => f.id === maybeFile.frame.id);

    console.log('skip %s', skip);
    console.log('limit %s', limit);

    const mirrors = frame.mirrors.slice(parseInt(skip as string), parseInt(limit as string));
  
    return res.status(200).send(mirrors);
  });

  // stage()
  app.post('/frames', (_, res) => {
    const frame: Frame = { id: randomBytes(16).toString('hex'), mirrors: [] };
    frames.push(frame);

    res.status(200).send({ id: frame.id });
  });

  // addShardToFrame()
  app.put('/frames/:id', (req, res) => {
    const { id } = req.params;
    const { hash, index, size } = req.body;
    // get all you can from here

    if (!id) {
      return res.status(400).send();
    }

    const maybeFrame: Frame | undefined = frames.find(f => f.id === id);

    if (!maybeFrame) {
      return res.status(404).send({ result: 'Not found' });
    }

    const mirror: Mirror = {
      farmer: {
        address: 'localhost',
        lastSeen: new Date(),
        nodeID: randomBytes(16).toString('hex'),
        userAgent: 'eooeoe',
        port: farmerPort,
        protocol: 'http'
      },
      hash,
      index,
      operation: 'PUSH',
      parity: false,
      replaceCount: 0,
      size,
      token: 'eee',
    }

    maybeFrame.mirrors.push(mirror);

    res.status(200).send(mirror);
  });

  // createEntryFromFrame()
  app.post('/buckets/:id/files', (req, res) => {
    const { id } = req.params;
    const { frame } = req.body;

    if (!id) {
      return res.status(400).send();
    }

    const file: BridgeFile = {
      frame, 
      id: randomBytes(16).toString('hex')  
    };

    files.push(file);

    console.log('files', JSON.stringify(files, null, 2));
    console.log('frames', JSON.stringify(frames, null, 2));

    res.status(200).send({
      id: file.id,
      index: 'testIndex',
      frame,
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
