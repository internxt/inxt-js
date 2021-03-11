/// <reference types="node" />
interface MerkleTree {
    leaf: string[];
    challenges: Buffer[];
    challenges_as_str: string[];
    preleaf: Buffer[];
}
export declare function preleaf(challenge: Buffer, encrypted: Buffer): Buffer;
declare function merkleTree(encrypted: Buffer): MerkleTree;
declare function getChallenges(mT: MerkleTree): string[];
declare function getTree(mT: MerkleTree): string[];
export { merkleTree, getChallenges, getTree, MerkleTree };
