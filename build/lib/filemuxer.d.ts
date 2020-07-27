/// <reference types="node" />
import { Readable } from 'stream';
interface FileMuxerOptions {
    shards: number;
    length: number;
    sourceDrainWait?: number;
    sourceIdleWait?: number;
}
/**
 * Accepts multiple ordered input sources and exposes them as a single
 * contiguous readable stream. Used for re-assembly of shards.
 */
declare class FileMuxer extends Readable {
    static DEFAULTS: {
        sourceDrainWait: number;
        sourceIdleWait: number;
    };
    private hasher;
    shards: number;
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
    /**
     * Implements the underlying read method
     * @private
     */
    _read(size?: number): boolean;
    /**
     * Adds an additional input stream to the multiplexer
     * @param readable - Readable input stream from file shard
     * @param hash - Hash of the shard
     * @param echangeReport - Instance of exchange report
     */
    addInputSource(readable: Readable, shardSize: number, shardParity: boolean, hash: Buffer, echangeReport: any): FileMuxer;
}
export default FileMuxer;
