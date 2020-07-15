import { Shard } from "../api/shard";
import { Transform } from 'stream'
import DecryptStream from "./decryptstream";
import { FileInfo } from "../api/fileinfo";
import { HashStream } from "./hashstream";

export class ShardDownloader extends Transform {
  fileInfo: FileInfo
  // private hasher: HashStream = null

  constructor(fileInfo: FileInfo) {
    super()
    this.fileInfo = fileInfo
    // this.hasher = new HashStream()
  }

  startDownload() {

  }
}