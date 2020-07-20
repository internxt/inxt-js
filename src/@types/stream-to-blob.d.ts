declare module "stream-to-blob" {
  import stream from 'stream'
  export default function streamToBlob(stream: stream.Readable, mimeType: string): Promise<Blob>
}