export interface Bucket {
  id: string;
  user: string;
  encryptionKey: string;
  publicPermissions: string[];
  created: Date;
  name: string;
  pubkeys: string[];
  status: string;
  transfer: number;
  storage: number;
}
