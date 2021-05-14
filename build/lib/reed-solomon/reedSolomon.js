"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var GaloisField_1 = __importDefault(require("./GaloisField"));
var ArrayOperators_1 = require("./ArrayOperators");
var ReedSolomon = /** @class */ (function () {
    // private blockSize
    function ReedSolomon(dataShardsN, parityShardsN, blockSize) {
        this.gf = new GaloisField_1.default();
        this.dataShardsN = dataShardsN;
        this.parityShardsN = parityShardsN;
        this.totalNumOfShards = dataShardsN + parityShardsN;
        //this.totalNumberOfShards = dataShards + parityShards // rs->shards
        var vm = this.gf.vandermonde(this.dataShardsN, this.dataShardsN);
        var top = ArrayOperators_1.subMatrix(vm, 0, 0, dataShardsN, dataShardsN, this.totalNumOfShards, dataShardsN);
        this.gf.invertMat(top, dataShardsN);
        this.m = this.gf.dotProduct(vm, this.totalNumOfShards, dataShardsN, top, dataShardsN, dataShardsN); //rs->m
        this.parity = ArrayOperators_1.subMatrix(this.m, dataShardsN, 0, this.totalNumOfShards, dataShardsN, this.totalNumOfShards, dataShardsN); // rs->parity
        // this.dataBlocks =
        this.fecBlocks = new Array(parityShardsN); // as number of elements in a shard
        for (var i = 0; i < parityShardsN; i++) {
            this.fecBlocks[i] = new Uint8Array(blockSize);
        }
        this.dataShardIndex = 0; // is it possible to remove?
        // this.blockSize = blockSize
    }
    ReedSolomon.prototype.encode = function (dataBlock, shardIndex, offset) {
        //data block size just to make sure we control the last shard
        for (var iRow = 0; iRow < this.parityShardsN; iRow++) {
            if (shardIndex != 0) {
                this.gf.addMul2(this.fecBlocks[iRow], dataBlock, this.parity[iRow * this.dataShardsN + this.dataShardIndex], dataBlock.length);
            }
            else {
                // this.gf.dotProduct()
            }
        }
        this.dataShardIndex++;
        // calback()
    };
    return ReedSolomon;
}());
exports.default = ReedSolomon;
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
