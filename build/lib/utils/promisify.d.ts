/// <reference types="node" />
import { Readable } from 'stream';
export declare function promisifyStream(stream: Readable): Promise<void>;
