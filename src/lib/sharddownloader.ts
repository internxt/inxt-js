import { Shard } from "../api/shard";
import { Transform } from 'stream'
import DecryptStream from "./decryptstream";
import { FileInfo } from "../api/fileinfo";

export class ShardDownloader extends Transform {
  fileInfo: FileInfo
  constructor(fileInfo: FileInfo) {
    super()
    this.fileInfo = fileInfo
  }
}