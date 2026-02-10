import { ActionState, Shard } from '../../../api';

import { DownloadStrategy } from './strategy';
import {
  DownloadOneShardStrategy,
  DownloadOneShardStrategyParams,
  DownloadOneStreamStrategy,
  DownloadOneStreamStrategyParams,
  DownloadOptions,
} from '.';
import { Events } from '..';

export type DownloadDynamicStrategyLabel = 'Dynamic';
export type DownloadDynamicStrategyObject<T> = {
  label: DownloadDynamicStrategyLabel;
  params: T extends DownloadOneShardStrategy ? DownloadOneShardStrategyParams : DownloadOneStreamStrategyParams;
};
export type DownloadDynamicStrategyFunction<T> = (
  bucketId: string,
  fileId: string,
  opts: DownloadOptions,
  strategyObj: DownloadDynamicStrategyObject<T>,
) => ActionState;

export class DownloadDynamicStrategy<
  T = DownloadOneShardStrategy | DownloadOneStreamStrategy,
> extends DownloadStrategy {
  private strategy?: DownloadStrategy;
  private params: DownloadOneShardStrategyParams | DownloadOneStreamStrategyParams;

  iv: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  fk: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  constructor(
    params: T extends DownloadOneShardStrategy ? DownloadOneShardStrategyParams : DownloadOneStreamStrategyParams,
  ) {
    super();

    this.params = params;
  }

  async download(mirrors: Shard[]): Promise<void> {
    if (mirrors.length === 1) {
      this.strategy = new DownloadOneShardStrategy(this.params);
    } else {
      this.strategy = new DownloadOneStreamStrategy(this.params as DownloadOneStreamStrategyParams);
    }

    this.strategy.iv = this.iv;
    this.strategy.fileEncryptionKey = this.fk;

    this.strategy.once(Events.Download.Start, () => {
      this.emit(Events.Download.Start);
    });
    this.strategy.once(Events.Download.Ready, (decipher) => {
      this.emit(Events.Download.Ready, decipher);
    });
    this.strategy.once(Events.Download.Error, (err) => {
      this.emit(Events.Download.Error, err);
    });
    this.strategy.once(Events.Download.Abort, () => {
      this.emit(Events.Download.Abort);
    });
    this.strategy.on(Events.Download.Progress, (progress) => {
      this.emit(Events.Download.Progress, progress);
    });

    await this.strategy.download(mirrors);
  }

  setIv(iv: Buffer): void {
    this.iv = iv;
  }

  setFileEncryptionKey(fk: Buffer): void {
    this.fk = fk;
  }

  abort(): void {
    this.strategy?.abort();
  }
}
