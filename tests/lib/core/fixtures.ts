import { generateMnemonic } from "bip39";

export function getValidMnemonic(): string {
  return generateMnemonic();
}

export function getInvalidMnemonic(): string {
  return '';
}

export function getNetworkCredentials(): { user: string, pass: string } {
  return { user: 'user', pass: 'pass' };
}

export function getBucketId(): string {
  return 'bucket-id';
}

export function getFileId(): string {
  return 'file-id';
}

export function getBridgeUrl(): string {
  return 'http://fake.com';
}

export function getFileBytes(content: string): Buffer {
  return Buffer.from(content, 'utf8');
}
