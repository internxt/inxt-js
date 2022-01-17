import { retry } from 'async';
import { createCipheriv } from 'crypto';
import { Readable } from 'stream';

import { NegotiateContract, UploadParams, UploadStrategy } from './strategy';
import { generateMerkleTree } from '../../utils/MerkleTree';
import { Abortable, ActionState, ShardObject } from '../../../api';
import { wrap } from '../../utils/error';
import { ProgressNotifier, Events as ProgressEvents, HashStream } from '../../utils/streams';
import { ShardMeta } from '../../models';

import { UploadOptions } from './';
import { Events } from '../';
import { logger } from '../../utils/logger';

interface Source {
  size: number;
  stream: Readable;
}

interface Params extends UploadParams {
  sourceToHash: Source;
  sourceToUpload: Source;
  useProxy: boolean;
}

export type UploadOneShardStrategyLabel = 'OneShardOnly';
export type UploadOneShardStrategyObject = { label: UploadOneShardStrategyLabel; params: Params };
export type UploadOneShardStrategyFunction = (
  bucketId: string,
  fileId: string,
  opts: UploadOptions,
  strategyObj: UploadOneShardStrategyObject,
) => ActionState;

/**
 * TODO:
 * - Tests
 */

export class UploadOneShardStrategy extends UploadStrategy {
  private sourceToHash: Source;
  private sourceToUpload: Source;
  private abortables: Abortable[] = [];
  private shardMeta?: ShardMeta;
  private aborted = false;

  private useProxy: boolean;
  private uploadProgress = 0;
  private encryptProgress = 0;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private uploadProgressIntervalId: NodeJS.Timeout = setTimeout(() => {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private encryptProgressIntervalId: NodeJS.Timeout = setTimeout(() => {});

  constructor(params: Params) {
    super();

    this.sourceToHash = params.sourceToHash;
    this.sourceToUpload = params.sourceToUpload;

    this.useProxy = params.useProxy;

    this.once(Events.Upload.Abort, this.abort.bind(this));
  }

  getIv(): Buffer {
    return this.iv;
  }

  getFileEncryptionKey() {
    return this.fileEncryptionKey;
  }

  setIv(iv: Buffer): void {
    if (iv.length === 16) {
      this.iv = iv;
    } else {
      throw new Error('Invalid IV length');
    }
  }

  setFileEncryptionKey(fk: Buffer) {
    if (fk.length === 32) {
      this.fileEncryptionKey = fk;
    } else {
      throw new Error('Invalid file encryption length');
    }
  }

  private startNotifyingUploadProgress() {
    this.uploadProgressIntervalId = setInterval(() => {
      this.emit(Events.Upload.Progress, this.uploadProgress);
    }, 5000);
  }

  private stopNotifyingUploadProgress() {
    clearInterval(this.uploadProgressIntervalId);
  }

  private startNotifyingEncryptProgress() {
    this.encryptProgressIntervalId = setInterval(() => {
      this.emit(Events.Upload.EncryptProgress, this.encryptProgress);
    }, 5000);
  }

  private stopNotifyingEncryptProgress() {
    clearInterval(this.encryptProgressIntervalId);
  }

  async upload(negotiateContract: NegotiateContract): Promise<void> {
    if (this.fileEncryptionKey.length === 0 || this.iv.length === 0) {
      throw new Error('Set file encryption key and iv before trying to upload');
    }

    try {
      this.emit(Events.Upload.EncryptStarted);

      const hashingStepCipher = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const hashingStepContent = this.sourceToHash.stream;
      const hashingStepHasher = new HashStream();
      const hashingStepProgress = new ProgressNotifier(this.sourceToHash.size, 5000);

      hashingStepProgress.on(ProgressEvents.Progress, (progress) => {
        this.encryptProgress = progress;
      });

      const hashingPipeline = hashingStepContent
        .pipe(hashingStepCipher)
        .pipe(hashingStepHasher)
        .pipe(hashingStepProgress);

      hashingStepCipher.once('error', (err) => hashingPipeline.emit('error', err));
      hashingStepHasher.once('error', (err) => hashingPipeline.emit('error', err));
      hashingStepProgress.once('error', (err) => hashingPipeline.emit('error', err));

      this.startNotifyingEncryptProgress();
      this.addToAbortables(() => this.stopNotifyingEncryptProgress());
      this.addToAbortables(() => hashingPipeline.destroy());

      const merkleTree = generateMerkleTree();

      await new Promise((resolve, reject) => {
        hashingPipeline.on('data', () => {
          // forces stream to flow
        }).once('error', (err) => {
          reject(err);
        }).once('end', () => {
          this.shardMeta = {
            hash: hashingStepHasher.getHash().toString('hex'),
            challenges_as_str: merkleTree.challenges_as_str,
            index: 0,
            parity: false,
            size: this.sourceToUpload.size,
            tree: merkleTree.leaf,
          };
          resolve(null);
        });
      });

      this.stopNotifyingEncryptProgress();
      this.emit(Events.Upload.EncryptFinished);

      logger.info('Upload/OneShardStrategy/Hashing: File hash encrypted is %s', this.shardMeta?.hash);

      const contract = await negotiateContract(this.shardMeta!);

      this.emit(Events.Upload.Started);

      const uploadStepCipher = createCipheriv('aes-256-ctr', this.fileEncryptionKey, this.iv);
      const uploadStepContent = this.sourceToUpload.stream;
      const uploadStepHasher = new HashStream();
      const uploadStepProgressNotifier = new ProgressNotifier(this.sourceToUpload.size, 5000);

      uploadStepProgressNotifier.on(ProgressEvents.Progress, (progress) => {
        this.uploadProgress = progress;
      });
      
      const uploadPipeline = uploadStepContent
        .pipe(uploadStepCipher)
        .pipe(uploadStepHasher)
        .pipe(uploadStepProgressNotifier);

      uploadStepContent.once('error', (err) => uploadPipeline.emit('error', err));
      uploadStepCipher.once('error', (err) => uploadPipeline.emit('error', err));
      uploadStepHasher.once('error', (err) => uploadPipeline.emit('error', err));
      uploadStepProgressNotifier.once('error', (err) => uploadPipeline.emit('error', err));

      this.startNotifyingUploadProgress();
      this.addToAbortables(() => uploadPipeline.destroy());
      this.addToAbortables(() => this.stopNotifyingUploadProgress());

      await retry({ times: 3, interval: 500 }, (nextTry) => {
        ShardObject.getPutStream(contract.url, this.useProxy).then((upstream) => {
          upstream.once('error', (err) => upstream.emit('error', err));

          return new Promise((resolve, reject) => {
            uploadPipeline
              .pipe(upstream)
              .once('error', reject)
              .once('end', resolve);
          });
        }).then(() => {
          const hashCalculatedUploading = uploadStepHasher.getHash().toString('hex');
          const hashCalculatedHashing = hashingStepHasher.getHash().toString('hex');

          logger.info('Upload/OneShardStrategy/Uploading: File hash encrypted is %s', hashCalculatedUploading);

          if (hashCalculatedUploading === hashCalculatedHashing) {
            logger.info('Upload/OneShardStrategy: File uploaded');
            return nextTry();
          }

          nextTry(new Error(
            'Hash mismatch: Uploading was ' + 
            hashCalculatedUploading + 
            ' hashing was ' + 
            hashCalculatedHashing
          ));
        }).catch((err) => {
          nextTry(err);
        });
      });

      this.stopNotifyingUploadProgress();
      this.emit(Events.Upload.Finished, { result: [this.shardMeta] });
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  private addToAbortables(abortFunction: () => void) {
    if (this.aborted) {
      abortFunction();
    } else {
      this.abortables.push({ abort: abortFunction });
    }
  }

  private handleError(err: Error) {
    this.abortables.forEach((abortable) => abortable.abort());

    this.emit(Events.Upload.Error, wrap('OneShardStrategyError', err as Error));
  }

  abort(): void {
    this.aborted = true;
    this.emit(Events.Upload.Abort);
    this.abortables.forEach((abortable) => abortable.abort());
    this.removeAllListeners();
  }
}
