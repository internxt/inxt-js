import { Shard } from "../../src/api/shard";

const shard: Shard = {
  farmer: {
    address: 'farmer.com',
    lastSeen: new Date(),
    nodeID: 'nodeId',
    port: 3000,
    protocol: '',
    userAgent: ''
  },
  hash: '',
  index: 0,
  operation: 'PUSH',
  parity: false,
  replaceCount: 0,
  size: 0,
  token: 'TOKEN',
  healthy: true
};

export function generateShard(): Shard {
  return shard;
}
