/// <reference types="node" />
export interface ShardMeta {
    hash: string;
    size: number;
    index: number;
    parity: boolean;
    challenges?: Buffer[];
    challenges_as_str: string[];
    tree: string[];
}
