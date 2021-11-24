export * from './upload';
export * from './download';

enum DownloadEvents {
  Error = 'download-error',
  Start = 'download-start',
  Ready = 'download-ready',
  Progress = 'download-progress',
  Abort = 'download-abort',
  Finish = 'download-finish'
}

enum UploadEvents {
  Error = 'upload-error',
  Started = 'upload-start',
  Progress = 'upload-progress',
  Abort = 'upload-aborted',
  Finished = 'upload-finished',
  ShardUploadSuccess = 'shard-upload-success',
}

export const Events = {
  Upload: UploadEvents,
  Download: DownloadEvents
}
