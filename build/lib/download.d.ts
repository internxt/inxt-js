/// <reference types="node" />
import { EnvironmentConfig } from '../index';
import { Readable } from 'stream';
export default function Download(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<Readable>;
