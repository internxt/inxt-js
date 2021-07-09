declare module 'multistream' {
    import { Readable, ReadableOptions } from 'stream';
    export default class Multistream extends Readable {
        constructor(streams: Readable[], opts?: ReadableOptions) 
    }
}