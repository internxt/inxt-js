import { expect } from 'chai';
import { computeShardSize, totalDataShards } from '../src/lib/utils/shard'
import assert from 'assert'

describe('# ShardSize Function', () => {
  const MIN_SHARD_SIZE = 2097152 // 2Mb
  const MAX_SHARD_SIZE = 4294967296 // 4 Gb
  it('Shard Size Function: Whatever file size below min, the shard must be equal to its min size.', () => {
    let expectedShardSize = MIN_SHARD_SIZE;
    let fileSize = 1000 // 100 bytes == 8 Mb
    assert.strictEqual(expectedShardSize, computeShardSize(fileSize))
  });
  it('Shard Size Function: Make Sure we do not exceed the shard max size.', () => {
    let expectedShardSize = MAX_SHARD_SIZE;
    let fileSize = 1012001737418240;
    assert.strictEqual(expectedShardSize, computeShardSize(fileSize))
  });
  it('Shard Size Function.', () => {
    let expectedShardSize = 33554432;
    let fileSize = 268435457;
    assert.strictEqual(expectedShardSize, computeShardSize(fileSize))
  });
  it('Shard Size Function.', () => {
    let expectedShardSize = 16777216;
    let fileSize = 134217729;
    assert.strictEqual(expectedShardSize, computeShardSize(fileSize))
  });
  it('Shard Size Function: Case We have a 0 B file.', () => {
    let expectedShardSize = 0;
    let fileSize = 0;
    assert.strictEqual(0, computeShardSize(fileSize))
  });

  it('Compute number of shards in a file.' , () => {
    let fileSize = 268435457;
    assert.strictEqual(9, totalDataShards(268435457));
  })
})