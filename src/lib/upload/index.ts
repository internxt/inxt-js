import { UploadFileOptions } from '../..';

export interface UploadOptions extends UploadFileOptions {
  filename: string;
}

export * from './upload';
export * from './OneStreamStrategy';
