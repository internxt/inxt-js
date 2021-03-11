import { NodeMock } from "../node";
import { BridgeMock, MirrorMock, ShardReferenced } from "../bridge";
interface NodeSpawner {
    port?: number;
    path?: string;
    ID?: string;
    hostname?: string;
}
interface MirrorSpawner {
    node?: NodeMock;
    bridge?: BridgeMock;
}
interface BridgeSpawner {
    mirrors?: ShardReferenced[];
}
interface ShardReferencedSpawner {
    index?: number;
    hash?: string;
    size?: number;
    parity?: boolean;
    token?: string;
    farmer?: {
        userAgent: string;
        protocol: string;
        address: string;
        port: number;
        nodeID: string;
        lastSeen: Date;
    };
    operation?: string;
    fileId?: string;
    bucketId?: string;
}
export declare const spawn: {
    node: (spawner: NodeSpawner) => NodeMock;
    mirror: (spawner: MirrorSpawner) => MirrorMock;
    bridge: (spawner: BridgeSpawner) => BridgeMock;
    shardReferenced: (spawner: ShardReferencedSpawner) => ShardReferenced;
};
export {};
