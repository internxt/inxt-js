import { NodeMock } from "../node";
import { randomBytes } from 'crypto';
import { BridgeMock, MirrorMock, ShardReferenced } from "../bridge";

/* ============ NODES ============ */
interface NodeSpawner {
    port?: number;
    path?: string;
    ID?: string;
    hostname?: string;
}

const spawnNode = (spawner: NodeSpawner): NodeMock => {
    const port: number = spawner.port ? spawner.port : 3000;
    const path: string = spawner.path ? spawner.path : '/shards';
    const ID: string = spawner.ID ? spawner.ID : randomBytes(32).toString('hex');
    const hostname: string = spawner.hostname ? spawner.hostname : 'www.fakenode.com';
    return new NodeMock(port, path, ID, hostname);
};

/* =========== MIRROR ============ */
interface MirrorSpawner {
    node?: NodeMock;
    bridge?: BridgeMock;
}

const spawnMirror = (spawner: MirrorSpawner): MirrorMock => {
    const node: NodeMock = spawner.node ? spawner.node : spawnNode({ });
    const bridge: BridgeMock = spawner.bridge ? spawner.bridge : spawnBridge({ });
    return new MirrorMock(node, bridge);
};

/* =========== BRIDGE ============ */
interface BridgeSpawner {
    mirrors?: ShardReferenced[];
}

const spawnBridge = (spawner: BridgeSpawner): BridgeMock => {
    const mirrors: ShardReferenced [] = spawner.mirrors ? spawner.mirrors : [spawnShardReferenced({ })];
    return new BridgeMock(mirrors);
};

/* =========== SHARD REFERENCED ========== */
interface ShardReferencedSpawner {
    index?: number;
    hash?: string;
    size?: number;
    parity?: boolean;
    token?: string;
    farmer?: {
        userAgent: string
        protocol: string
        address: string
        port: number
        nodeID: string
        lastSeen: Date
    };
    operation?: string;
    fileId?: string;
    bucketId?: string;
}

const spawnShardReferenced = (spawner: ShardReferencedSpawner): ShardReferenced => {
    const index: number = spawner.index ? spawner.index : 0;
    const hash: string = spawner.hash ? spawner.hash : randomBytes(32).toString('hex');
    const size: number = spawner.size ? spawner.size : 10000;
    const parity: boolean = spawner.parity ? spawner.parity : true;
    const token: string = spawner.token ? spawner.token : randomBytes(32).toString('hex');
    const farmer = spawner.farmer ? spawner.farmer : {
        userAgent: 'Mozilla 5.0',
        protocol: '1.2.0-INXT',
        address: 'www.fakeaddress.com',
        port: 3000,
        nodeID: randomBytes(32).toString('hex'),
        lastSeen: new Date()
    };
    const operation: string = spawner.operation ? spawner.operation : '';
    const fileId: string = spawner.fileId ? spawner.fileId : randomBytes(32).toString('hex');
    const bucketId: string = spawner.bucketId ? spawner.bucketId : randomBytes(32).toString('hex');

    return { index, replaceCount: 0, hash, size, parity, token, farmer, operation, fileId, bucketId };
};

export const spawn = {
    node: spawnNode,
    mirror: spawnMirror,
    bridge: spawnBridge,
    shardReferenced: spawnShardReferenced
};
