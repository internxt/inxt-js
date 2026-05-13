import { ShardMeta } from '../../src/lib/models';

const shardMeta: ShardMeta = {
  challenges_as_str: [],
  hash: '',
  index: 0,
  parity: false,
  size: 0,
  tree: [],
};

export function generateShardMeta(): ShardMeta {
  return shardMeta;
}
