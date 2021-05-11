declare module "blob-to-stream" {
    import stream from "stream"
    export default function blobToStream(blob: Blob): stream.Readable
}
