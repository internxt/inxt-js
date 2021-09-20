import { logger } from '../lib/utils/logger';
import { buildCommand } from './CommandInterface';
import { downloadFile } from './download-file';
import { uploadFile } from './upload-file';
import { uploadFolder } from './upload-folder-zip';

function notifyProgramFinished(programName: string) {
  return () => {
    logger.info('Program "%s" finished', programName);
  };
}

export const uploadFileCommand = buildCommand({
  version: '0.0.1',
  command: 'upload-file <path>',
  description: 'Upload a file',
  options: []
}).action((path) => {
  uploadFile(path).finally(notifyProgramFinished('upload-file'));
});

export const uploadFolderZipCommand = buildCommand({
  version: '0.0.1',
  command: 'upload-folder-zip <path>',
  description: 'Upload a folder zipped',
  options: []
}).action((path: string) => {
  uploadFolder(path).finally(notifyProgramFinished('upload-folder-zip'));
});

export const downloadFileCommand = buildCommand({
  version: '0.0.1',
  command: 'download-file <fileId> <path>',
  description: 'Download a file',
  options: []
}).action((fileId, path) => {
  downloadFile(fileId, path).finally(notifyProgramFinished('download-file'));
});

// export const downloadFolderZippedCommand = buildCommand({
//   version: '0.0.1',
//   name: 'download-folder-zip',
//   description: 'Download a folder zipped',
//   options: [
//     {
//       flags: '-f, --fileId <fileId>',
//       description: 'Internxt Network file id of the zipped folder'
//     },
//     {
//       flags: '-p, --path <path>',
//       description: 'path where zipped folder is going to be downloaded'
//     }
//   ]
// });
