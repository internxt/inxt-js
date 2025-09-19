import { logger } from '../lib/utils/logger';
import { buildCommand } from './CommandInterface';
import { createBucket } from './create-bucket';
import { deleteBucket } from './delete-bucket';
import { downloadFile } from './download-file';
import { downloadFileMultipart } from './download-file-multipart';
import { getDownloadLinks } from './get-download-links';
import { getFileInfo } from './get-filo-info';
import { renameFile } from './rename-file';
import { uploadFile } from './upload-file';
import { uploadFileMultipart } from './upload-file-multipart';
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
  options: [],
}).action((path) => {
  return uploadFile(path);
});

export const uploadFileMultipartCommand = buildCommand({
  version: '0.0.1',
  command: 'upload-file-multipart <path>',
  description: 'Upload a file using multipart',
  options: [],
}).action((path) => {
  return uploadFileMultipart(path);
});

export const uploadFolderZipCommand = buildCommand({
  version: '0.0.1',
  command: 'upload-folder-zip <path>',
  description: 'Upload a folder zipped',
  options: [],
}).action((path: string) => {
  uploadFolder(path).finally(notifyProgramFinished('upload-folder-zip'));
});

export const downloadFileCommand = buildCommand({
  version: '0.0.1',
  command: 'download-file <fileId> <path>',
  description: 'Download a file',
  options: [],
}).action((fileId, path) => {
  downloadFile(fileId, path, 1).finally(notifyProgramFinished('download-file'));
});

export const downloadFileCommandParallel = buildCommand({
  version: '0.0.1',
  command: 'download-file-parallel <fileId> <path>',
  description: 'Download a file',
  options: [],
}).action((fileId, path) => {
  downloadFile(fileId, path, 10).finally(notifyProgramFinished('download-file-parallel'));
});

export const renameFileCommand = buildCommand({
  version: '0.0.1',
  command: 'rename-file <fileId> <newName>',
  description: 'Renames a file in the network',
  options: [],
}).action((fileId, newName) => {
  renameFile(fileId, newName).finally(notifyProgramFinished('rename-file'));
});

export const getFileInfoCommand = buildCommand({
  version: '0.0.1',
  command: 'get-file-info <fileId>',
  description: 'Gets file info',
  options: [],
}).action((fileId) => {
  getFileInfo(fileId).finally(notifyProgramFinished('get-file-info'));
});

export const createBucketCommand = buildCommand({
  version: '0.0.1',
  command: 'create-bucket <bucketName>',
  description: 'Creates a bucket with the given name',
  options: [],
}).action((bucketName: string) => {
  createBucket(bucketName).finally(notifyProgramFinished('create-bucket'));
});

export const deleteBucketCommand = buildCommand({
  version: '0.0.1',
  command: 'delete-bucket <bucketId>',
  description: 'Deletes a bucket given its id',
  options: [],
}).action((bucketId: string) => {
  deleteBucket(bucketId).finally(notifyProgramFinished('delete-bucket'));
});

export const getDownloadLinksCommand = buildCommand({
  version: '0.0.1',
  command: 'get-download-links <bucketId> <fileIdsSeparatedByCommas>',
  description: 'Gets download links of file ids',
  options: [],
}).action((bucketId: string, fileIdsSeparatedByCommas: string) => {
  getDownloadLinks(bucketId, fileIdsSeparatedByCommas.split(',')).finally(notifyProgramFinished('get-download-links'));
});

export const downloadFileMultipartCommand = buildCommand({
  version: '0.0.1',
  command: 'download-file-multipart <fileId> <fileSize> <path>',
  description: 'Downloads a file by parts',
  options: [],
}).action((fileId: string, fileSize: string, path: string) => {
  downloadFileMultipart(fileId, parseInt(fileSize), path).finally(notifyProgramFinished('download-file-multipart'));
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
