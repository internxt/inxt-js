import { UploadOptions } from '.';

export type UploadStrategyFunction = (bucketId: string, opts: UploadOptions) => Promise<string>;
