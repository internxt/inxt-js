import { FileInfo } from "../api/fileinfo";

import { DecryptFileName } from "../lib/utils/crypto";
import { logger } from "../lib/utils/logger";

import { getEnvironment } from "./CommandInterface";

export function getFileInfo(fileId: string): Promise<void> {
  logger.info('Retrieving info for file %s', fileId);

  const network = getEnvironment();
  const bucketId = process.env.BUCKET_ID;

  if (!network.config.encryptionKey) {
    console.log('Mnemonic not provided');
  }

  let fileInfo: FileInfo;

  return network.getFileInfo(bucketId, fileId).then((info) => {
    fileInfo = info;

    return DecryptFileName(network.config.encryptionKey ?? '', bucketId, fileInfo.filename);
  }).then((plainFilename) => {
    console.log({ ...fileInfo, plainFilename })
  }).catch((err) => {
    logger.error('Error retrieving info for file %s: %s', fileId, err.message);
  })
}
