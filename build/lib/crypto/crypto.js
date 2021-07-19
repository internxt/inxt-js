"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Aes256gcmEncrypter = exports.Aes256ctrEncrypter = exports.Aes256ctrDecrypter = exports.EncryptMetaBuffer = exports.EncryptMeta = exports.DecryptFileName = exports.EncryptFilename = exports.GenerateFileKey = exports.GenerateBucketKey = exports.GetDeterministicKey = exports.ripemd160 = exports.sha512HmacBuffer = exports.sha512 = exports.sha256HashBuffer = exports.sha256 = void 0;
var crypto = __importStar(require("crypto"));
var bip39_1 = require("bip39");
var constants_1 = require("./constants");
function sha256(input) {
    return crypto.createHash('sha256').update(input).digest();
}
exports.sha256 = sha256;
function sha256HashBuffer() {
    return crypto.createHash('sha256');
}
exports.sha256HashBuffer = sha256HashBuffer;
function sha512(input) {
    return crypto.createHash('sha512').update(input).digest();
}
exports.sha512 = sha512;
function sha512HmacBuffer(key) {
    return crypto.createHmac('sha512', Buffer.from(key, 'hex'));
}
exports.sha512HmacBuffer = sha512HmacBuffer;
function ripemd160(input) {
    return crypto.createHash('ripemd160').update(input).digest();
}
exports.ripemd160 = ripemd160;
function GetDeterministicKey(key, data) {
    var sha512input = key + data;
    return crypto.createHash('sha512').update(Buffer.from(sha512input, 'hex')).digest();
}
exports.GetDeterministicKey = GetDeterministicKey;
function GenerateBucketKey(mnemonic, bucketId) {
    return __awaiter(this, void 0, void 0, function () {
        var seed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bip39_1.mnemonicToSeed(mnemonic)];
                case 1:
                    seed = (_a.sent()).toString('hex');
                    return [2 /*return*/, GetDeterministicKey(seed, bucketId).toString('hex').slice(0, 64)];
            }
        });
    });
}
exports.GenerateBucketKey = GenerateBucketKey;
function GenerateFileKey(mnemonic, bucketId, index) {
    return __awaiter(this, void 0, void 0, function () {
        var bucketKey;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, GenerateBucketKey(mnemonic, bucketId)];
                case 1:
                    bucketKey = _a.sent();
                    return [2 /*return*/, GetDeterministicKey(bucketKey.slice(0, 32), index.toString('hex')).slice(0, 32)];
            }
        });
    });
}
exports.GenerateFileKey = GenerateFileKey;
function EncryptFilename(mnemonic, bucketId, filename) {
    return __awaiter(this, void 0, void 0, function () {
        var bucketKey, GenerateEncryptionKey, GenerateEncryptionIv, encryptionKey, encryptionIv;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, GenerateBucketKey(mnemonic, bucketId)];
                case 1:
                    bucketKey = _a.sent();
                    GenerateEncryptionKey = function () {
                        var hasher = sha512HmacBuffer(bucketKey);
                        hasher.update(Buffer.from(constants_1.BUCKET_META_MAGIC));
                        return hasher.digest().slice(0, 32);
                    };
                    GenerateEncryptionIv = function () {
                        var hasher = sha512HmacBuffer(bucketKey);
                        hasher.update(bucketId).update(filename);
                        return hasher.digest().slice(0, 32);
                    };
                    encryptionKey = GenerateEncryptionKey();
                    encryptionIv = GenerateEncryptionIv();
                    return [2 /*return*/, EncryptMeta(filename, encryptionKey, encryptionIv)];
            }
        });
    });
}
exports.EncryptFilename = EncryptFilename;
function DecryptFileName(mnemonic, bucketId, encryptedName) {
    return __awaiter(this, void 0, void 0, function () {
        var bucketKey, key;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, GenerateBucketKey(mnemonic, bucketId)];
                case 1:
                    bucketKey = _a.sent();
                    if (!bucketKey) {
                        throw Error('Bucket key missing');
                    }
                    key = crypto.createHmac('sha512', Buffer.from(bucketKey, 'hex')).update(Buffer.from(constants_1.BUCKET_META_MAGIC)).digest('hex');
                    return [2 /*return*/, decryptMeta(encryptedName, key)];
            }
        });
    });
}
exports.DecryptFileName = DecryptFileName;
function decryptMeta(bufferBase64, decryptKey) {
    var data = Buffer.from(bufferBase64, 'base64');
    var digest = data.slice(0, constants_1.GCM_DIGEST_SIZE);
    var iv = data.slice(constants_1.GCM_DIGEST_SIZE, constants_1.GCM_DIGEST_SIZE + constants_1.SHA256_DIGEST_SIZE);
    var buffer = data.slice(constants_1.GCM_DIGEST_SIZE + constants_1.SHA256_DIGEST_SIZE);
    var decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(decryptKey, 'hex').slice(0, 32), iv);
    decipher.setAuthTag(digest);
    try {
        var dec = Buffer.concat([decipher.update(buffer), decipher.final()]);
        return dec.toString('utf8');
    }
    catch (e) {
        return null;
    }
}
function EncryptMeta(fileMeta, key, iv) {
    var cipher = Aes256gcmEncrypter(key, iv);
    var cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf-8'), cipher.final()]);
    var digest = cipher.getAuthTag();
    return Buffer.concat([digest, iv, cipherTextBuf]).toString('base64');
}
exports.EncryptMeta = EncryptMeta;
function EncryptMetaBuffer(fileMeta, encryptKey, iv) {
    var cipher = Aes256gcmEncrypter(encryptKey, iv);
    var cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf-8'), cipher.final()]);
    var digest = cipher.getAuthTag();
    return Buffer.concat([digest, iv, cipherTextBuf]);
}
exports.EncryptMetaBuffer = EncryptMetaBuffer;
function Aes256ctrDecrypter(key, iv) {
    return crypto.createDecipheriv('aes-256-ctr', key, iv);
}
exports.Aes256ctrDecrypter = Aes256ctrDecrypter;
function Aes256ctrEncrypter(key, iv) {
    return crypto.createCipheriv('aes-256-ctr', key, iv);
}
exports.Aes256ctrEncrypter = Aes256ctrEncrypter;
function Aes256gcmEncrypter(key, iv) {
    return crypto.createCipheriv('aes-256-gcm', key, iv);
}
exports.Aes256gcmEncrypter = Aes256gcmEncrypter;
