import { EnvironmentConfig } from '../index';
import DecryptStream from './decryptstream';
export default function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<DecryptStream>;
