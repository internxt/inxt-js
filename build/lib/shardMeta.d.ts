/// <reference types="node" />
export interface ShardMeta {
    hash: string;
    size: number;
    index: number;
    parity: boolean;
    challenges?: Buffer[];
    challenges_as_str: string[];
    tree: string[];
    exclude?: any;
}
export declare function getShardMeta(encryptedShardData: Buffer, fileSize: number, index: number, parity: boolean, exclude?: any): ShardMeta;
