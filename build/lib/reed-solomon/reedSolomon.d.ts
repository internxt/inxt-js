export default class ReedSolomon {
    private dataShardsN;
    private gf;
    private parityShardsN;
    private m;
    private parity;
    private fecBlocks;
    private dataShardIndex;
    private totalNumOfShards;
    constructor(dataShardsN: number, parityShardsN: number, blockSize: number);
    encode(dataBlock: Uint8Array, shardIndex: number, offset: number): void;
}
