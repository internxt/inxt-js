/// <reference types="node" />
import { Readable, Transform } from 'stream';
import { NodeMock } from '../node';
import { Shard } from '../../../../api/shard';
import { BridgeMock } from './bridge';
import { EnvironmentConfig } from '../../../../../src';
export declare class MirrorMock {
    private _node;
    private _bridge;
    constructor(node: NodeMock, bridge: BridgeMock);
    DownloadShardRequest(config: EnvironmentConfig, address: string, port: number, hash: string, token: string, nodeID: string): Readable;
    DownloadShard(config: EnvironmentConfig, shard: Shard, bucketId: string, fileId: string, excludedNodes?: string[]): Promise<Transform | never>;
    UploadShard(node: NodeMock, shardStream: Readable): Promise<boolean>;
}
