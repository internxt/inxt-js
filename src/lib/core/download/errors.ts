/**
 * DOWNLOAD ERROR CODES: 1XXX
 * UPLOAD ERROR CODES: 2XXX
 * CRYPTOGRAPHY ERROR CODES: 1/2 + 1XX
 */

enum ErrorCodes {
  DownloadHashMismatch = 1000,
  DownloadUnknownAlgorithm = 1100,
}

class CodeError extends Error {
  constructor(
    protected errorMessage: string,
    protected errorCode: number
  ) {
    super(`${errorMessage} (ERRNO: ${errorCode})`);
  }
}

class DownloadError extends CodeError {
  constructor(protected errorCode: number) {
    super('Download failed', errorCode);
  }
}

export default {
  ErrorCodes,
  downloadHashMismatchError: new DownloadError(ErrorCodes.DownloadHashMismatch),
  downloadUnknownAlgorithmError: new DownloadError(ErrorCodes.DownloadUnknownAlgorithm)
};
