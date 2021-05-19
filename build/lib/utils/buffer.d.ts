/// <reference types="node" />
import { Readable } from 'stream';
export declare function bufferToStream(buf: Buffer, chunkSize?: number): Readable;
