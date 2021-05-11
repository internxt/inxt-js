declare module "mux-demux" {
  import { Stream, Writable } from 'stream';
  function WrapperFunction(): Stream;
  interface MuxDemuxOptions {
    error: boolean;
    wrapper: (stream: Stream) => Stream;
  }
  function MuxDemux(options?: MuxDemuxOptions, onConnection?: (stream: Stream) => void): Writable;
  export default MuxDemux;
}
