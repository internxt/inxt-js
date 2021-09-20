"use strict";
// import { eachLimit, ErrorCallback, queue } from "async";
// import { createDecipheriv } from "crypto";
// import { Readable } from "stream";
// import { Abortable } from "../../api/Abortable";
// import { Shard } from "../../api/shard";
// import { ShardObject } from "../../api/ShardObject";
// import { getStream } from "../../services/request";
// import { wrap } from "../utils/error";
// import { DownloadEvents, DownloadStrategy } from "./DownloadStrategy";
// export class MultipleStreamStrategy extends DownloadStrategy {
//   private abortables: Abortable[] = [];
//   async download(mirrors: Shard[]): Promise<void> {
//     try {
//       this.emit(DownloadEvents.Start);
//       const decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
//       const downloadStreamsRefs: { index: number, stream: Readable }[] = [];
//       await eachLimit(mirrors, 6, (mirror, next) => {
//         getDownloadStream(mirror).then((downloadStream) => {
//           downloadStreamsRefs.push({
//             index: mirror.index,
//             stream: downloadStream
//           });
//           next();
//         }).catch((err) => {
//           next(err);
//         });
//       });
//       const downloadsBuffer: { index: number, content: Buffer } [] = [];
//       let currentShardIndex = 0;
//       const decryptingTask = (shardEncrypted: Buffer) => {
//         return new Promise((resolve) => {
//           if (!decipher.write(shardEncrypted)) {
//             decipher.once('drain', resolve);
//           } else{
//             resolve(null);
//           } 
//         });
//       };
//       const decryptQueue = queue((encryptedShard: Buffer, cb: ErrorCallback<Error>) => {
//         decryptingTask(encryptedShard).then(() => cb()).catch(cb);
//       }, 1);
//       setInterval(() => {
//         const downloadedShardIndex = downloadsBuffer.findIndex(download => download.index === currentShardIndex);
//         const shardReady = downloadedShardIndex !== -1;
//         if (shardReady) {
//           decryptQueue.push(downloadsBuffer[downloadedShardIndex].content);
//           downloadsBuffer[downloadedShardIndex].content = Buffer.alloc(0);
//           currentShardIndex++;
//         }
//       }, 50);
//       const downloadTask = (downloadStream: Readable): Promise<Buffer> => {
//         const buffers: Buffer[] = [];
//         return new Promise((resolve, reject) => {
//           downloadStream.on('data', buffers.push.bind(buffers));
//           downloadStream.once('error', reject);
//           downloadStream.once('end', () => resolve(Buffer.concat(buffers)));          
//         });
//       }
//       const downloadWorker = (downloadStreamRef: { stream: Readable, index: number }, cb: ErrorCallback<Error>) => {
//         downloadTask(downloadStreamRef.stream).then((downloadedShard) => {
//           downloadsBuffer.push({
//             index: downloadStreamRef.index,
//             content: downloadedShard
//           });
//           cb();
//         }).catch(cb);
//       }
//       const downloadQueue = queue(downloadWorker, 1);
//       downloadStreamsRefs.sort((a, b) => a.index - b.index);
//       downloadStreamsRefs.forEach(downloadQueue.push.bind(downloadQueue));
//       this.emit(DownloadEvents.Ready, decipher);
//     } catch (err) {
//       this.emit(DownloadEvents.Error, wrap('OneStreamStrategyError', err as Error));
//     }
//   }
//   abort(): void {
//     this.abortables.forEach((abortable) => abortable.abort());
//     this.emit(DownloadEvents.Abort);
//   }
// }
// function getDownloadStream(shard: Shard): Promise<Readable> {
//   return ShardObject.requestGet(buildRequestUrlShard(shard)).then(getStream);
// }
// function buildRequestUrlShard(shard: Shard) {
//   const { address, port } = shard.farmer;
//   return `http://${address}:${port}/download/link/${shard.hash}`;
// }
