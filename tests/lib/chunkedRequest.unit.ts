import express from 'express';
import { request, Server } from 'http';

let httpServer: express.Application;
let app: Server;

before(() => {
  return new Promise((res) => {
    httpServer = express();
    httpServer.post('/', (req, res) => {
      req.on('data', (chunk: Buffer) => {
        console.log('data received %s', chunk.length)
      });
    });

    app = httpServer.listen(3001, () => res(null));
  })
});

after((done) => {
  app.close(() => {
    console.log('closing server');
    done();
  })
})

describe('', () => {
  it('', () => {
    request('http://localhost:3001')
  })
})