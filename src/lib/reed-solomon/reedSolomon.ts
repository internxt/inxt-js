import GaloisField from './GaloisField'
import { subMatrix } from './ArrayOperators'

interface RS {
  dataShards: number,
  parityShards: number,
  shards: number,
  m: Uint8Array,
  parity: Uint8Array
}

export default class ReedSolomon {

    private dataShardsN: number
    private gf: GaloisField
    private parityShardsN: number
    private m
    private parity // also called matrixRows
    private fecBlocks
    private dataShardIndex
    private totalNumOfShards
    private blockSize

    constructor(dataShardsN: number, parityShardsN:number, blockSize: number) { // check if block size is really needed
      this.gf = new GaloisField()
      this.dataShardsN = dataShardsN
      this.parityShardsN = parityShardsN
      this.totalNumOfShards = dataShardsN + parityShardsN
      //this.totalNumberOfShards = dataShards + parityShards // rs->shards
      const vm = this.gf.vandermonde(this.dataShardsN, this.dataShardsN)
      const top = subMatrix(vm, 0, 0, dataShardsN, dataShardsN, this.totalNumOfShards, dataShardsN)
      this.gf.invertMat(top, dataShardsN)
      this.m = this.gf.dotProduct(vm, this.totalNumOfShards, dataShardsN, top, dataShardsN, dataShardsN) //rs->m
      this.parity = subMatrix(this.m, dataShardsN, 0, this.totalNumOfShards, dataShardsN, this.totalNumOfShards, dataShardsN) // rs->parity
      // this.dataBlocks =
      this.fecBlocks = new Array(parityShardsN) // as number of elements in a shard
      for(let i=0; i<parityShardsN;i++) {
        this.fecBlocks[i] = new Uint8Array(blockSize)
      }
      this.dataShardIndex = 0 // is it possible to remove?
      this.blockSize = blockSize
    }


    encode(dataBlock: Uint8Array, shardIndex: number, offset: number): void {
      //data block size just to make sure we control the last shard
      for(let iRow=0; iRow<this.parityShardsN; iRow++) {
        if(shardIndex != 0) {
          this.gf.addMul2(
            this.fecBlocks[iRow],
            dataBlock,
            this.parity[iRow*this.dataShardsN + this.dataShardIndex],
            dataBlock.length,
            )
        }
        else {
          this.gf.dotProduct()
        }
      }
      this.dataShardIndex++
      calback()
    }
}


/*
class ReedSolomonEncoder extends Transform {
  private shardIndex = 0
  private indexRow
  public fec_blocks
  public parity
  private numberOfDataShards
  //private matrixRows =
  public
  constructor(parity, blockSize, numberOfDataShards: number) {
    super()
    this.dataBlocks = new Uint8Array()
    this.fecBlocks = new Uint8Array()
    this.indexRow = 0
    this.blockSize = blockSize
    this.numberOfDataShards = numberOfDataShards
    this.parity

  }

  _transform(dataBlock, encoding, callback) {
    if(this.shardIndex != 0) {
      // gf.dotProduct, parity with indexRow
      gf.dotProduct(parity, dataBlock, this.parity[this.indexRow * this.numberOfDataShards + this.shardIndex])
    }
    else {
      // gf.addMul
    }
    this.shardIndex++
  }

  _flush(){
  }
}*/