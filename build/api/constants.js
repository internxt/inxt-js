"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARD_MULTIPLE_BACK = exports.MAX_SHARD_SIZE = exports.MIN_SHARD_SIZE = exports.DOWNLOAD_CANCELLED_ERROR = exports.BUCKET_ID_NOT_PROVIDED = exports.ENCRYPTION_KEY_NOT_PROVIDED = exports.UPLOAD_CANCELLED = exports.DOWNLOAD_CANCELLED = exports.DEFAULT_INXT_MIRRORS = void 0;
exports.DEFAULT_INXT_MIRRORS = 6;
/* EVENTS */
exports.DOWNLOAD_CANCELLED = 'DOWNLOAD CANCELLED';
exports.UPLOAD_CANCELLED = 'UPLOAD CANCELLED';
/* ERRORS */
exports.ENCRYPTION_KEY_NOT_PROVIDED = 'Encryption key was not provided';
exports.BUCKET_ID_NOT_PROVIDED = 'Bucket id was not provided';
exports.DOWNLOAD_CANCELLED_ERROR = 'Process killed by user';
exports.MIN_SHARD_SIZE = 2097152;
exports.MAX_SHARD_SIZE = 4294967296;
exports.SHARD_MULTIPLE_BACK = 4;
