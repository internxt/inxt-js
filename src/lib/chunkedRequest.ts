import { URL } from 'url';
import { request } from 'https';
import { ClientRequest, IncomingMessage } from 'http';

import EventEmitter from 'events';
import { PassThrough, Readable } from 'stream';

interface RequestOptions {
  hostname: string,
  pathname: string,
  method: string,
  protocol: string
}

type FinishCallback = (res: Buffer | null, err?: Error) => void;

export class ChunkedRequest extends EventEmitter {
  private options: RequestOptions;
  private stream: ClientRequest;
  private passthrough = new PassThrough();

  private response: Buffer[] = [];

  constructor(url: URL) {
    super();

    const { hostname, pathname } = url;

    this.options = { hostname, pathname, method: 'POST', protocol: 'https:' };

    const req = request(this.options, (res: IncomingMessage) => {
      res.on('data', this.response.push.bind(this));
      res.once('end', () => this.emit('request-end', this.response));
      res.once('error', (err) => {
        res.removeAllListeners();

        this.emit('err', err)
        this.destroy();         
      });
    });

    this.stream = this.passthrough.pipe(req);
  }

  write(b: Buffer, end = false, finishCb: FinishCallback): void {
    Readable.from(b).pipe(this.stream, { end })
      .once('error', (err) => finishCb(null, err))
      .once('end', finishCb);
  }

  end(b: Buffer, cb: FinishCallback) {
    this.write(b, true, (res: Buffer | null, err?: Error) => {
      if (err) {
        cb(res, err);
      } else {
        cb(Buffer.concat(this.response));
      }
      this.destroy();
    });   
  }

  destroy() {
    this.removeAllListeners();
  }
}
