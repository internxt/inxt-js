import { Shard } from "../api/shard";
import { Transform } from 'stream'
import DecryptStream from "./decryptstream";
import { FileInfo } from "../api/fileinfo";
import { HashStream } from "./hashstream";

export class ShardDownloaderStream extends Transform {
  fileInfo: FileInfo
  shardInfo: Shard

  constructor(fileInfo: FileInfo, shardInfo: Shard) {
    super()
    this.fileInfo = fileInfo
    this.shardInfo = shardInfo
  }

  startDownload() {

  }
}