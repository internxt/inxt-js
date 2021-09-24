import { DownloadEvents } from "../lib/download/DownloadStrategy";

enum UploadEvents {
  Abort = 'upload-aborted'
}

export const Events = {
  Upload: UploadEvents,
  Download: DownloadEvents
}
