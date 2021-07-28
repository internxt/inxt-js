declare module "readable-web-to-node-stream" {
  import { Readable } from "stream";

  /**
   * Converts a Web-API stream into Node stream.Readable class
   * Node stream readable: https://nodejs.org/api/stream.html#stream_readable_streams
   * Web API readable-stream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
   * Node readable stream: https://nodejs.org/api/stream.html#stream_readable_streams
   */
  export class ReadableWebToNodeStream extends Readable {
    public bytesRead: number;
    public released: boolean;

    /**
     * Default web API stream reader
     * https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader
     */
    private reader: ReadableStreamReader<any>;
    private pendingRead: Promise<any>;

    /**
     *
     * @param stream Readable Stream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
     */
    constructor(stream: ReadableStream);

    /**
     * If there is no unresolved read call to Web-API Readable Stream immediately returns;
     * otherwise will wait until the read is resolved.
     */
    public waitForReadToComplete(): Promise<void>;

    /**
     * Close wrapper
     */
    public close(): Promise<void>;
    private syncAndRelease(): Promise<void>;
  }
}
