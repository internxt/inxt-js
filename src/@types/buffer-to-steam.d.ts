declare module "buffer-to-stream" {
  import { Readable } from 'stream';
  export default function convert(buffer: Buffer | string, chunkSize?: number): Readable;
}
