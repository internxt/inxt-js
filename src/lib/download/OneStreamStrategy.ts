import { eachLimit } from "async";
import { createDecipheriv } from "crypto";
import Multistream from "multistream";
import { pipeline, Readable, Writable } from "stream";
import { promisify } from "util";

import { Abortable } from "../../api/Abortable";
import { Shard } from "../../api/shard";
import { ShardObject } from "../../api/ShardObject";
import { getStream } from "../../services/request";
import { wrap } from "../utils/error";
import { DownloadEvents, DownloadStrategy } from "./DownloadStrategy";

const pipelineAsync = promisify(pipeline);

interface Params {
  destination: Writable;
}

export class OneStreamStrategy extends DownloadStrategy {
  private abortables: Abortable[] = [];
  private destination: Writable;

  constructor(params: Params) {
    super();

    this.destination = params.destination;
  }

  async download(mirrors: Shard[]): Promise<void> {
    try {
      this.emit(DownloadEvents.Start);

      const decipher = createDecipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const downloadStreamsRefs: { index: number, stream: Readable }[] = [];

      await eachLimit(mirrors, 6, (mirror, next) => {
        getDownloadStream(mirror).then((downloadStream) => {
          downloadStreamsRefs.push({
            index: mirror.index,
            stream: downloadStream
          });
          next();
        }).catch((err) => {
          next(err);
        });
      });

      downloadStreamsRefs.sort((a, b) => a.index - b.index);

      const downloadPipeline = downloadStreamsRefs.map(ref => ref.stream);
      const muxer = new Multistream(downloadPipeline);

      downloadPipeline.forEach(stream => {
        this.abortables.push({ abort: () => stream.destroy() });
      });

      this.abortables.push({ abort: () => muxer.destroy() });

      await pipelineAsync(muxer, decipher, this.destination);

      this.emit(DownloadEvents.Finish);
    } catch (err: any) {
      this.emit(DownloadEvents.Error, wrap('OneStreamStrategyError', err));
    }
  }

  abort(): void {
    this.abortables.forEach((abortable) => abortable.abort());
    this.emit(DownloadEvents.Abort);
  }
}

function getDownloadStream(shard: Shard): Promise<Readable> {
  return ShardObject.requestGet(buildRequestUrlShard(shard)).then((getUrl) => {
    return getStream(getUrl);
  });
}

function buildRequestUrlShard(shard: Shard) {
  const { address, port } = shard.farmer;

  return `http://${address}:${port}/download/link/${shard.hash}`;
}
