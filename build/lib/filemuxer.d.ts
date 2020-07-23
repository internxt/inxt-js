/// <reference types="node" />
import { Readable } from 'stream';
interface FileMuxerOptions {
    shards: number;
    length: number;
    sourceDrainWait?: number;
    sourceIdleWait?: number;
}
declare class FileMuxer extends Readable {
    static DEFAULTS: {
        sourceDrainWait: number;
        sourceIdleWait: number;
    };
    private hasher;
    private shards;
    private length;
    private inputs;
    private bytesRead;
    private added;
    private options;
    private sourceDrainTimeout;
    constructor(options: FileMuxerOptions);
    private checkOptions;
    private waitForSourceAvailable;
    private mux;
    private readFromSource;
    _read(): boolean | void;
    /**
     * Adds an additional input stream to the multiplexer
     * @param readable - Readable input stream from file shard
     * @param hash - Hash of the shard
     * @param echangeReport - Instance of exchange report
     */
    addInputSource(readable: Readable, hash: Buffer, echangeReport: any): FileMuxer;
}
export default FileMuxer;
