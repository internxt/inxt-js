/// <reference types="node" />
interface MerkleTree {
    leaf: string[];
    challenges: Buffer[];
    challenges_as_str: string[];
    preleaf: Buffer[];
}
export declare function generateMerkleTree(): MerkleTree;
export {};
